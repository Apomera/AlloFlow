// Word Sounds packet builder: makes a practice file from a word list with no AI and no app.
// One plain script for a browser page (window.AlloPacketBuilder) and for node (module.exports).
// It calls nothing on the network; the caller hands it every input.
//
// The functions inside createPackLogic are COPIES of pure logic in word_sounds_setup_source.jsx
// (the app's "Prepare lesson"). tests/word_sounds_packet_builder.test.js runs both and compares,
// so keep the bodies close to the originals and change them together.
(function (root) {
  'use strict';

  var VERSION = 'alloflow-packet-builder/0.1.0';
  var SUPPORTED = ['isolation', 'segmentation', 'counting', 'mapping', 'missing_letter', 'orthography', 'word_scramble',
    'spelling_bee', 'letter_tracing', 'blending', 'rhyming', 'word_families', 'sound_sort'];
  var LENGTHS = { short: 5, medium: 10, long: 15 };
  // Familiarity cut-off for pickWords: a word is familiar when the app's own K-2 lists hold it, or
  // children's books use it often enough: Zipf frequency in CYP-LEX books for ages 7-9 at or above
  // DEFAULT_MIN_ZIPF, in at least DEFAULT_MIN_BOOKS of its 400 books (a name is usually in few books).
  // Both numbers were chosen by reading real output on 2026-11-11; see data/vendor/cyplex/source.json
  // for what the data is and is not.
  var DEFAULT_MIN_ZIPF = 3.8;
  var DEFAULT_MIN_BOOKS = 20;
  // The older rule (place in the reading-library frequency list, built from old books). It applies
  // only when the word list carries no child-book column, or when the caller passes maxRank.
  var DEFAULT_MAX_RANK = 4000;

  // The notice of data/vendor/cmudict/LICENSE, word for word: the sound labels come from CMUdict.
  var CMUDICT_NOTICE = [
    'Copyright (C) 1993-2015 Carnegie Mellon University. All rights reserved.',
    '',
    'Redistribution and use in source and binary forms, with or without',
    'modification, are permitted provided that the following conditions',
    'are met:',
    '',
    '1. Redistributions of source code must retain the above copyright',
    '   notice, this list of conditions and the following disclaimer.',
    '   The contents of this file are deemed to be source code.',
    '',
    '2. Redistributions in binary form must reproduce the above copyright',
    '   notice, this list of conditions and the following disclaimer in',
    '   the documentation and/or other materials provided with the',
    '   distribution.',
    '',
    'This work was supported in part by funding from the Defense Advanced',
    'Research Projects Agency, the Office of Naval Research and the National',
    'Science Foundation of the United States of America, and by member',
    'companies of the Carnegie Mellon Sphinx Speech Consortium. We acknowledge',
    'the contributions of many volunteers to the expansion and improvement of',
    'this dictionary.',
    '',
    "THIS SOFTWARE IS PROVIDED BY CARNEGIE MELLON UNIVERSITY ``AS IS'' AND",
    'ANY EXPRESSED OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,',
    'THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR',
    'PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL CARNEGIE MELLON UNIVERSITY',
    'NOR ITS EMPLOYEES BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,',
    'SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT',
    'LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,',
    'DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY',
    'THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT',
    '(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE',
    'OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.',
  ].join('\n');
  var ATTRIBUTIONS = [
    'Word sounds: Carnegie Mellon Pronouncing Dictionary (CMUdict), Copyright (C) 1993-2015 Carnegie Mellon University, converted to sound labels by AlloFlow',
    'Machine-made recordings: Kokoro-82M text-to-speech (voice af_heart)',
    'Machine-made recordings: Google Gemini text-to-speech, made ahead of time',
  ];

  // ---------------------------------------------------------------------------
  // Seeded order
  // ---------------------------------------------------------------------------
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function fnv1a(text) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h;
  }
  function seedFor(seed, word) { return fnv1a(String(seed == null ? '' : seed) + '|' + String(word)); }
  function hex8(n) { return ('0000000' + (n >>> 0).toString(16)).slice(-8); }

  // ---------------------------------------------------------------------------
  // Copied from word_sounds_setup_source.jsx. Removed: every AI call (sentence, story, definition,
  // picture), the eSpeak rung, React state (reviewed syllable recordings and counts, the chosen
  // voice) and the three reading boards that need an AI sentence. Changed: shuffleForPack draws
  // from a generator seeded per word, and a row's id is its place in the list, not the clock.
  // ---------------------------------------------------------------------------
  function createPackLogic(config) {
    const WS_CORE = config.core;
    const alloData = Array.isArray(config.knownWords) ? { SOUND_MATCH_POOL: config.knownWords } : (config.knownWords || {});
    const packSeed = config.seed;
    const wordSoundsLanguage = 'en';
    const instructionalProfile = {};
    let random = mulberry32(seedFor(packSeed, ''));

    const PACK_COMMON_WORDS = ['cat','dog','sun','map','bed','pig','cup','hat','fish','star','tree','frog','duck','book','run','red','sit','fan','hop','moon','pen','top','ring','rock','look','mug'];
    let _k2Known = null;
    const k2KnownWords = () => {
        if (_k2Known) return _k2Known;
        const set = new Set(PACK_COMMON_WORDS);
        const add = (w) => {
            const v = String(w || '').trim().toLowerCase();
            if (v) set.add(v);
        };
        try {
            const data = alloData;
            (data.SOUND_MATCH_POOL || []).forEach(add);
            Object.values(data.RIME_FAMILIES || {}).forEach((list) => (list || []).forEach(add));
            Object.values(data.SIGHT_WORD_PRESETS || {}).forEach((list) => (list || []).forEach(add));
            Object.values(data.WORD_FAMILY_PRESETS || {}).forEach((list) => {
                if (Array.isArray(list)) list.forEach(add);
                else if (list && Array.isArray(list.words)) list.words.forEach(add);
            });
        } catch (e) { /* the screen degrades to structure-only */ }
        _k2Known = set;
        return set;
    };
    // Hard rejects: not a candidate phonics word under any reading.
    const isUnusableAsPhonicsWord = (w) => {
        const v = String(w || '').trim();
        if (!v) return true;
        if (!/^[a-zA-Z]+$/.test(v)) return true;          // digits, punctuation, spaces
        if (v.length < 2 || v.length > 10) return true;   // "a" is a sight word, not a family member
        if (!/[aeiouy]/i.test(v)) return true;            // no vowel = not a word
        return false;
    };
    const packSoundNotes = (analysis) => {
        const notes = {};
        ['welded', 'units', 'twoSound', 'silentLetters', 'vowelPatterns'].forEach((key) => { if (analysis.flags[key].length) notes[key] = analysis.flags[key]; });
        if (analysis.flags.ed) notes.ed = analysis.flags.ed;
        if (analysis.flags.finalLe) notes.finalLe = true;
        if (analysis.flags.schwa) notes.schwa = true;
        return Object.keys(notes).length ? notes : undefined;
    };
    const preparePackWordAiFree = async (env) => {
        const { word: rawWord, index = 0, batchWords = [], isEnglish, estimate } = env;
        const word = String(rawWord || '').trim();
        if (!isEnglish || !word) return null;
        const loaded = await WS_CORE.loadPhonemeDictionary();
        const entry = loaded ? WS_CORE.dictionarySounds(word) : null;
        let sounds, source, alternates = [];
        if (entry) { sounds = entry.sounds; source = 'dictionary'; alternates = entry.alternates; }
        else { sounds = typeof estimate === 'function' ? estimate(word) : []; source = 'estimate'; }
        const labels = sounds.map((sound) => WS_CORE.phonemeLabel(sound, true)).filter(Boolean);
        const trusted = source !== 'estimate';
        const analysis = WS_CORE.soundAnalysis(word, trusted ? labels : []);
        const safePool = [...new Set([...PACK_COMMON_WORDS, ...k2KnownWords()])].filter((value) => !isUnusableAsPhonicsWord(value));
        const derived = WS_CORE.derivedAnswerSets({
            word, sounds: trusted ? labels : [], pool: safePool,
            sessionWords: batchWords.map((value) => String(typeof value === 'string' ? value : value?.word || value?.targetWord || '').trim().toLowerCase()).filter((value) => value && !isUnusableAsPhonicsWord(value)),
            soundsOf: (value) => { const found = WS_CORE.dictionarySounds(value); return found ? found.sounds : null; },
            // A real word = any sound-dictionary word (checked inside) or any word on the app's lists.
            isRealWord: (value) => k2KnownWords().has(value),
        });
        const text = {};
        const image = null;
        const glance = WS_CORE.soundsNeedGlance({ source, sounds: labels, alternates });
        const words = (values) => (Array.isArray(values) ? values : []).filter((value) => !isUnusableAsPhonicsWord(value));
        return {
            id: index + 1,
            term: word, word, targetWord: word, displayWord: word,
            phonemes: source === 'dictionary' ? labels : sounds,
            phonemeCount: sounds.length,
            syllableBlendingOptions: [],
            graphemes: source === 'dictionary' ? analysis.graphemes : [],
            // Sound Mapping: how many sound boxes each spelling chip covers (qu, x, the u of cute, le cover two).
            chipSpans: source === 'dictionary' && analysis.chipSpans.some((n) => n === 2) ? analysis.chipSpans : undefined,
            rhymes: derived.rhymeWord ? [derived.rhymeWord] : [],
            rhymeWord: derived.rhymeWord,
            rhymePronunciation: derived.rhymeWord && derived.rhymePhonemes ? { word: derived.rhymeWord, phonemes: derived.rhymePhonemes } : undefined,
            _rhymeSource: derived.rhymeWord ? 'derived' : undefined,
            rhymeDistractors: derived.rhymeDistractors,
            blendingDistractors: derived.blendingDistractors,
            orthographyDistractors: derived.orthographyDistractors,
            sentence: typeof text.sentence === 'string' ? text.sentence.trim() : '',
            sentenceDistractors: words(text.sentenceDistractors),
            story: Array.isArray(text.story) ? text.story : [],
            familyEnding: derived.familyEnding,
            familyMembers: derived.familyMembers,
            firstSound: WS_CORE.phonemeLabel(sounds[0] || word[0], true),
            lastSound: WS_CORE.phonemeLabel(sounds[sounds.length - 1] || word[word.length - 1], true),
            definition: text.definition,
            image,
            manipulationTask: null,
            _fallbackUsed: source === 'estimate' || undefined,
            _phonemeSource: source === 'estimate' ? 'estimated' : source,
            phonemeSource: source,
            phonemeAlternates: alternates.length ? alternates : undefined,
            soundNotes: trusted ? packSoundNotes(analysis) : undefined,
            _soundsGlance: glance.length ? glance : undefined,
            _soundEvidence: derived.evidence.length ? derived.evidence : undefined,
            // The aligner decided: a missing spelling means "ask the teacher", never a letter-by-letter guess.
            _graphemeSource: source === 'dictionary' ? 'aligner' : undefined,
            _mappingNote: source === 'dictionary' && analysis.mapping.status !== 'ready' ? analysis.mapping.status : undefined,
        };
    };

    const normalizePackKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const shuffleForPack = (values) => {
        const out = [...(values || [])];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    };
    const packIsEnglish = true;
    const flatPackPhoneme = (p) => WS_CORE.phonemeLabel(p, packIsEnglish);
    const estimatePackPhonemes = (word) => {
        const w = normalizePackKey(word).replace(/[^a-z]/g, '');
        if (!w) return [];
        const trigraphs = ['igh', 'tch', 'dge'];
        const digraphs = ['sh','ch','th','wh','ph','ng','ck','qu','wr','kn','gn','mb','ar','er','ir','or','ur','ai','ay','au','aw','ea','ee','ei','ey','ew','ie','oa','oe','oi','oo','ou','ow','oy','ue'];
        const result = [];
        let i = 0;
        while (i < w.length) {
            if (i < w.length - 2 && trigraphs.includes(w.slice(i, i + 3))) {
                result.push(w.slice(i, i + 3));
                i += 3;
            } else if (i < w.length - 1 && digraphs.includes(w.slice(i, i + 2))) {
                result.push(w.slice(i, i + 2));
                i += 2;
            } else if (w[i] === 'c' && i < w.length - 1 && 'eiy'.includes(w[i + 1])) {
                result.push('s');
                i++;
            } else if (w[i] === 'g' && i < w.length - 1 && 'eiy'.includes(w[i + 1])) {
                result.push('j');
                i++;
            } else {
                result.push(w[i]);
                i++;
            }
        }
        return result;
    };
    const compileActivityItems = (items) => {
        const rhymeSession = WS_CORE.createRhymeSession();
        const commonWords = packIsEnglish ? PACK_COMMON_WORDS : [];
        const itemWords = items.map((item) => normalizePackKey(item.targetWord || item.word || item.term)).filter(Boolean);
        const wordPool = [...new Set([...itemWords, ...commonWords])];
        const allPackPhonemes = [...new Set(items.flatMap((it) => (it.phonemes || []).map(flatPackPhoneme)).filter(Boolean))];
        const allPackLetters = [...new Set(itemWords.join('').split(''))];
        const packRimeOf = (w) => {
            const v = normalizePackKey(w);
            if (packIsEnglish) return (v.match(/[aeiou][a-z]*$/) || [''])[0];
            return v.slice(-2);
        };
        items.forEach((item, itemIndex) => {
            const word = normalizePackKey(item.targetWord || item.word || item.term);
            random = mulberry32(seedFor(packSeed, word));
            const phonemes = (item.phonemes || []).map(flatPackPhoneme).filter(Boolean);
            const seed = word.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
            const position = phonemes.length ? seed % phonemes.length : 0;
            const correctSound = phonemes[position] || item.firstSound || estimatePackPhonemes(word)[0] || 'a';
            const isolationPool = packIsEnglish
                ? [...phonemes, 'b','d','f','g','k','l','m','n','p','r','s','t','a','e','i','o','u','sh','ch','th']
                : [...phonemes, ...allPackPhonemes];
            const isolationOptions = shuffleForPack([...new Set([correctSound, ...isolationPool.filter((value) => value && value !== correctSound)])].slice(0, 6));
            const chipDistractorPool = packIsEnglish
                ? ['s','t','m','p','k','n','r','l','b','g','f','h','d','sh','ch','th','a','e','i','o','u']
                : allPackPhonemes;
            const chipDistractors = shuffleForPack(chipDistractorPool.filter((value) => !phonemes.includes(value))).slice(0, 5);
            const chips = shuffleForPack([
                ...phonemes.map((value, index) => ({ id: `correct-${index}`, phoneme: value, type: 'correct', isDistractor: false })),
                ...chipDistractors.map((value, index) => ({ id: `distractor-${index}`, phoneme: value, type: 'distractor', isDistractor: true })),
            ]);
            const otherWords = wordPool.filter((value) => value !== word);
            const HOMOPHONE_SETS = [['sun','son'],['ate','eight'],['sea','see'],['eye','i'],['know','no'],['knight','night'],['right','write'],['meet','meat'],['whale','wail'],['bee','be'],['two','to','too'],['four','for'],['one','won'],['hear','here'],['blue','blew'],['red','read'],['pear','pair'],['flower','flour'],['dear','deer'],['bear','bare'],['tail','tale'],['sail','sale'],['mail','male'],['plane','plain'],['road','rode'],['hole','whole'],['week','weak'],['hair','hare']];
            const soundsLike = (a, b) => {
                const la = normalizePackKey(a), lb = normalizePackKey(b);
                if (!la || !lb) return false;
                if (la === lb) return true;
                return HOMOPHONE_SETS.some((set) => set.includes(la) && set.includes(lb));
            };
            const boardWithAnswer = (answer, pool, distractorCount) => shuffleForPack([
                answer,
                ...[...new Set(pool)].filter((value) => value && !soundsLike(value, answer)).slice(0, distractorCount),
            ]);
            const blending = boardWithAnswer(word, [...(item.blendingDistractors || []), ...otherWords], 5);
            const rhymeBoard = WS_CORE.buildSessionRhymeBoard({
                session: rhymeSession, occurrenceId: itemIndex,
                word, answer: item.rhymeWord || (item.rhymes || [])[0] || '',
                phonemes: item.phonemes,
                answerPhonemes: item.rhymePronunciation && normalizePackKey(item.rhymePronunciation.word) === normalizePackKey(item.rhymeWord || (item.rhymes || [])[0])
                    ? item.rhymePronunciation.phonemes : undefined,
                pool: [...items, ...(Array.isArray(item._soundEvidence) ? item._soundEvidence : []), ...commonWords],
                distractors: item.rhymeDistractors || [],
                prepared: item.activityItems?.rhyming,
                isEnglish: packIsEnglish,
            });
            const task = WS_CORE.resolveManipulationTask(word, item.manipulationTask, wordSoundsLanguage);
            if (!item.manipulationTask) item.manipulationTask = task;
            const manipulationFill = packIsEnglish ? ['sit','map','bed','pin','mud','fan'] : otherWords;
            const manipulation = WS_CORE.manipulationReady(task)
                ? boardWithAnswer(task.answer, [...(task.distractors || []), ...manipulationFill], 5) : [];
            const itemSyllable = item.activityItems?.syllable_blending;
            const storedSyllable = itemSyllable;
            const syllableTask = WS_CORE.resolveSyllableTask(word, storedSyllable, wordSoundsLanguage);
            const countAudio = item._ttsAssets?.[word];
            if (countAudio) item._ttsAssets = { ...(item._ttsAssets || {}), [word]: countAudio };
            const countContext = WS_CORE.createSyllableCountAudioContext({ asset: countAudio,
                voice: '', language: wordSoundsLanguage });
            const countingTask = WS_CORE.resolveSyllableCount(word, { language: wordSoundsLanguage,
                prepared: item.activityItems?.syllable_counting,
                audioContext: countContext,
                recordedTask: storedSyllable, syllables: item.syllables });
            const syllables = syllableTask.supported ? [...syllableTask.syllables] : [...countingTask.syllables];
            item.syllables = syllables;
            const recordingChoices = [...(item.syllableBlendingOptions || []), ...wordPool].filter(value => value !== word);
            const countDistance = value => {
                const resolved = WS_CORE.resolveSyllableCount(value, { language: wordSoundsLanguage });
                return resolved.supported ? Math.abs(resolved.count - syllableTask.syllables.length) : Infinity;
            };
            recordingChoices.sort((a, b) => countDistance(a) - countDistance(b));
            const choiceBoard = [storedSyllable, itemSyllable].find(board =>
                WS_CORE.validSyllableBoard(board) && WS_CORE.packAudioKey(board.targetWord) === word &&
                WS_CORE.resolveSyllableTask(word, board, wordSoundsLanguage).supported);
            const syllableOptions = syllableTask.supported
                ? choiceBoard ? [...choiceBoard.options]
                : boardWithAnswer(word, syllableTask.contentStatus === 'teacher_recorded' ? recordingChoices : shuffleForPack(WS_CORE.syllableWords().filter(value => value !== word)), 3) : [];
            const aligned = packIsEnglish && typeof WS_CORE.soundAnalysis === 'function' ? WS_CORE.soundAnalysis(word, phonemes) : null;
            const letterGuessAllowed = item._graphemeSource !== 'aligner' &&
                (!aligned || !aligned.chunks || (aligned.mapping.status === 'ready' && aligned.graphemes.join('|') === word.split('').join('|')));
            const spelling = [[item.graphemes, item.chipSpans],
                [(item.phonemes || []).map(p => p && typeof p === 'object' ? p.grapheme : ''), null],
                ...(aligned && aligned.mapping.status === 'ready' && !item._fallbackUsed ? [[aligned.graphemes, aligned.chipSpans]] : []), ...(letterGuessAllowed ? [[word.split(''), null]] : [])]
                .map(([values, spans]) => [values, Array.isArray(values) && values.length > 0 &&
                    values.every(value => typeof value === 'string' && value.trim()) &&
                    normalizePackKey(values.join('')).normalize('NFC') === word.normalize('NFC') ? WS_CORE.mappingChipSpans(values, phonemes.length, spans) : null])
                .find(([, spans]) => spans) || [[], null];
            const graphemes = spelling[0];
            const chipSpans = spelling[1] && spelling[1].some(n => n === 2) ? spelling[1] : null;
            item.graphemes = graphemes;
            if (chipSpans) item.chipSpans = chipSpans; else delete item.chipSpans;
            const letters = word.split('');
            for (let i = letters.length - 1; i > 0; i--) {
                const j = (seed + i) % (i + 1);
                [letters[i], letters[j]] = [letters[j], letters[i]];
            }
            if (letters.length > 1 && letters.join('') === word) [letters[0], letters[1]] = [letters[1], letters[0]];
            const hiddenIndex = word.length > 1 ? seed % word.length : 0;
            const correctLetter = word[hiddenIndex] || '';
            const letterDistractorPool = packIsEnglish
                ? 'abcdefghijklmnopqrstuvwxyz'.split('')
                : shuffleForPack(allPackLetters);
            const letterOptions = shuffleForPack([...new Set([correctLetter, ...letterDistractorPool.filter((value) => value !== correctLetter)])].slice(0, 4));
            const mode = item.soundSortMatches?.position || (seed % 2 === 0 ? 'first' : 'last');
            const soundBoard = packIsEnglish ? WS_CORE.buildSoundSort({ word, phonemes: item.phonemes, mode,
                pool: [...items, ...WS_CORE.knownWords], matches: item.soundSortMatches?.words || [],
                teacherEdited: !!item.soundSortMatches?.teacherEdited, targetSound: item.soundSortMatches?.phoneme,
                distractors: item.soundSortMatches?.distractors || [] }) : null;
            const familySpec = item.rimeFamilyMembers;
            const teacherFamily = familySpec?.teacherEdited === true;
            const suppliedRime = normalizePackKey(familySpec?.rime || item.familyEnding || '').replace(/^-/, '');
            const rime = suppliedRime && (teacherFamily || word.endsWith(suppliedRime)) ? suppliedRime
                : (packIsEnglish ? (word.match(/[aeiou][a-z]*$/) || [''])[0] : packRimeOf(word));
            const familyWords = values => [...new Set((Array.isArray(values) ? values : []).filter(v => typeof v === 'string').map(normalizePackKey).filter(v => v && v !== word))];
            const familySource = familyWords(familySpec?.words || item.familyMembers).filter(value => teacherFamily || (rime && value.endsWith(rime) && value.length > rime.length));
            const familyOptions = teacherFamily ? familySource.slice(0, 8)
                : shuffleForPack(familySource.length ? familySource : wordPool.filter(value => value !== word && rime && value.endsWith(rime) && value.length > rime.length)).slice(0, word.length <= 3 ? 3 : 5);
            const familyDistractors = teacherFamily ? familyWords(familySpec.distractors).slice(0, 8)
                : shuffleForPack(wordPool.filter(value => value !== word && !value.endsWith(rime))).slice(0, word.length <= 3 ? 2 : 4);
            const familyCandidate = { rime, options: familyOptions, distractors: familyDistractors, ...(teacherFamily ? { teacherEdited: true } : {}) };
            const familyBoard = WS_CORE.validWordFamilyBoard(familyCandidate, word) ? familyCandidate : null;
            const decodingChoices = boardWithAnswer(word, [...itemWords, ...commonWords].filter((value) => value !== word), 3);
            item.activityItems = {
                counting: { options: [1,2,3,4,5,6,7,8,9,10,'11+'], answer: item.phonemeCount || phonemes.length },
                isolation: { position, correctSound, options: isolationOptions },
                segmentation: { chips, slotCount: item.phonemeCount || phonemes.length },
                blending: { options: blending, answer: word },
                rhyming: rhymeBoard,
                manipulation: { task, options: manipulation },
                syllable_blending: { ...syllableTask, options: syllableOptions, answer: word },
                syllable_counting: { ...countingTask, answer: countingTask.supported ? countingTask.count : null },
                orthography: { options: shuffleForPack([...new Set([word, ...(item.orthographyDistractors || [])])]), answer: word },
                mapping: graphemes.length
                    ? { graphemes, ...(chipSpans ? { chipSpans } : {}), chipOrder: shuffleForPack(graphemes.map((value, index) => ({ id: index, text: String(value) }))),
                        ...(item.soundNotes && (item.soundNotes.welded || item.soundNotes.units) ? { soundUnits: [...(item.soundNotes.welded || []), ...(item.soundNotes.units || [])] } : {}) }
                    : { supported: false, contentStatus: 'teacher_review_required', graphemes: [], chipOrder: [], ...(item._mappingNote ? { reason: item._mappingNote } : {}) },
                spelling_bee: { answer: word },
                word_scramble: { letters, answer: word },
                missing_letter: { hiddenIndex, correctLetter, options: letterOptions },
                ...(soundBoard ? { sound_sort: soundBoard } : {}),
                letter_tracing: { letter: word[0] || '' },
                ...(familyBoard ? { word_families: familyBoard } : {}),
                decoding: { choices: decodingChoices },
            };
        });
        items.forEach(item => {
            const text = [item.word || item.targetWord, item.activityItems?.read_sentence?.sentence, item.activityItems?.read_passage?.story].filter(Boolean).join(' ');
            item._instructionalProfile = instructionalProfile;
            item._instructionalCoverage = WS_CORE.profileCheck(text, instructionalProfile);
        });
        return items;
    };
    return { PACK_COMMON_WORDS, k2KnownWords, isUnusableAsPhonicsWord, normalizePackKey, estimatePackPhonemes, preparePackWordAiFree, compileActivityItems };
  }

  // ---------------------------------------------------------------------------
  // Audio: bank lookups only, unless the caller passes speak()
  // ---------------------------------------------------------------------------
  var PORTABLE = /^data:audio\/(?:wav|x-wav|wave|mpeg|mp3)[;,]/i;
  var AUDIO_URI = /^data:audio\/[a-z0-9.+-]+(;[^,]*)?,/i;
  function pcmToWavUri(base64, sampleRate) {
    var pcm = atob(String(base64).replace(/\s+/g, ''));
    var rate = sampleRate || 24000, n = pcm.length;
    var u32 = function (v) { return String.fromCharCode(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); };
    var u16 = function (v) { return String.fromCharCode(v & 255, (v >>> 8) & 255); };
    var header = 'RIFF' + u32(36 + n) + 'WAVEfmt ' + u32(16) + u16(1) + u16(1) + u32(rate) + u32(rate * 2) + u16(2) + u16(16) + 'data' + u32(n);
    return 'data:audio/wav;base64,' + btoa(header + pcm);
  }
  // A bank entry as { uri } (a data: address) or null. PCM entries ({ base64, sampleRate }) become WAV here.
  function entryUri(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') return AUDIO_URI.test(entry) ? entry : null;
    if (typeof entry === 'object' && typeof entry.base64 === 'string' && entry.base64) {
      if (typeof entry.mime === 'string' && /^audio\//i.test(entry.mime)) return 'data:' + entry.mime.trim().toLowerCase() + ';base64,' + entry.base64.replace(/\s+/g, '');
      try { return pcmToWavUri(entry.base64, entry.sampleRate); } catch (_) { return null; }
    }
    return null;
  }
  function own(object, key) { return !!object && Object.prototype.hasOwnProperty.call(object, key); }
  function wordsOf(bank) { return bank && bank.words && typeof bank.words === 'object' && !bank.words.base64 ? bank.words : (bank || {}); }

  var SOURCE_NAMES = { recorded: 'recorded', kokoro: 'Kokoro bank', spoken: 'spoken now' };
  function createAudio(banks, speak, toWav, allowUnconverted) {
    var b = banks || {}, gap = b.gapFill || {};
    var layers = {
      words: [[b.words || {}, 'recorded'], [wordsOf(b.kokoroWords), 'kokoro']],
      phonemes: [[b.phonemes || {}, 'recorded'], [gap.phonemes || {}, 'kokoro']],
      isolation: [[b.isolation || {}, 'recorded'], [gap.isolation || {}, 'kokoro']],
      instructions: [[b.instructions || {}, 'recorded'], [gap.instructions || {}, 'kokoro']],
    };
    var found = {};
    var find = function (category, key) {
      var list = layers[category] || [];
      for (var i = 0; i < list.length; i++) if (own(list[i][0], key) && list[i][0][key]) return { entry: list[i][0][key], source: list[i][1] };
      return null;
    };
    var hasClip = function (category, key) { return !!find(category, key); };
    // Resolves one clip to a portable data: address, or says why not.
    var resolve = function (category, key) {
      var id = category + '|' + key;
      if (found[id]) return Promise.resolve(found[id]);
      var hit = find(category, key);
      var start = hit ? Promise.resolve({ uri: entryUri(hit.entry), source: hit.source })
        : category === 'words' && typeof speak === 'function'
          ? Promise.resolve().then(function () { return speak(key); }).then(function (made) { return { uri: entryUri(made), source: 'spoken' }; }, function () { return { uri: null, source: 'spoken' }; })
          : Promise.resolve({ uri: null, source: null });
      return start.then(function (got) {
        var out = { category: category, key: key, source: got.source ? SOURCE_NAMES[got.source] : null, uri: null, status: 'none', format: '' };
        if (!got.uri) return out;
        var format = got.uri.slice(5, got.uri.search(/[;,]/));
        if (PORTABLE.test(got.uri)) { out.uri = got.uri; out.status = 'ready'; out.format = format; return out; }
        var convert = typeof toWav === 'function'
          ? Promise.resolve().then(function () { return toWav(got.uri, { category: category, key: key }); }).then(function (v) { return typeof v === 'string' && PORTABLE.test(v) ? v : null; }, function () { return null; })
          : Promise.resolve(null);
        return convert.then(function (wav) {
          if (wav) { out.uri = wav; out.status = 'ready'; out.format = 'audio/wav (from ' + format + ')'; }
          else if (allowUnconverted) { out.uri = got.uri; out.status = 'ready'; out.format = format + ' (not converted: may not play on iPad or older Safari)'; }
          else out.status = typeof toWav === 'function' ? 'convert_failed' : 'needs_converter';
          return out;
        });
      }).then(function (out) { found[id] = out; return out; });
    };
    return { hasClip: hasClip, resolve: resolve, found: found };
  }

  var BOARD_WORDS = {
    blending: ['options'], rhyming: ['options', 'answer'], word_families: ['options', 'distractors'],
    sound_sort: ['options', 'distractors'], orthography: [], decoding: ['choices'],
  };
  function boardWords(activity, board) {
    var out = [];
    (BOARD_WORDS[activity] || []).forEach(function (field) {
      var value = board && board[field];
      (Array.isArray(value) ? value : [value]).forEach(function (v) {
        var text = typeof v === 'string' ? v : v && typeof v === 'object' ? (v.word || v.text || '') : '';
        if (text) out.push(String(text).trim().toLowerCase());
      });
    });
    return out;
  }

  var BOARD_REASONS = {
    rhyming: 'no rhyme partner', word_families: 'no word family for this word', sound_sort: 'no checked sound-sort set for this word',
    mapping: 'the spelling of this word does not map one sound at a time', blending: 'not enough answer choices',
  };
  function plainReason(activity, code, audio) {
    var status = function (category, key) { var f = audio.found[category + '|' + key]; return f ? f.status : 'none'; };
    var clip = function (what, state) {
      return state === 'needs_converter' ? 'the recording for ' + what + ' is WebM and no converter was supplied'
        : state === 'convert_failed' ? 'the recording for ' + what + ' could not be converted to WAV' : 'no recording for ' + what;
    };
    if (code === 'word') return null;
    if (code.indexOf('word:') === 0) return clip('the answer choice "' + code.slice(5) + '"', status('words', code.slice(5)));
    if (/^\/.+\/$/.test(code)) return clip('the sound ' + code, 'none');
    if (code === 'question' && activity === 'word_families') return 'no recording for the word ending';
    if (code === 'question' || code === 'as in') return 'no recording for the spoken question';
    if (code === 'board') return BOARD_REASONS[activity] || 'this word does not fit the activity';
    if (code === 'rhyme_review_required') return 'no rhyme partner that could be checked by sound';
    if (code === 'sound_review_required') return 'no checked sound-sort set for this word';
    return String(code).replace(/_/g, ' ');
  }

  function safeJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }
  // The loader writes attributions: [] and has no option for it yet, so the credits are added to
  // the manifest block of the finished file. That block is data, not script: the script hash holds.
  function withCredits(html, extra) {
    var open = '<script type="application/json" id="packet-manifest">';
    var at = html.indexOf(open);
    if (at < 0) return { html: html, done: false };
    var from = at + open.length, to = html.indexOf('</script>', from);
    if (to < 0) return { html: html, done: false };
    var manifest;
    try { manifest = JSON.parse(html.slice(from, to)); } catch (_) { return { html: html, done: false }; }
    if (!manifest || typeof manifest !== 'object') return { html: html, done: false };
    Object.keys(extra).forEach(function (key) {
      if (key === 'attributions') manifest.attributions = (Array.isArray(manifest.attributions) ? manifest.attributions : []).concat(extra.attributions.filter(function (line) { return (manifest.attributions || []).indexOf(line) < 0; }));
      else manifest[key] = extra[key];
    });
    return { html: html.slice(0, from) + safeJson(manifest) + html.slice(to), done: true };
  }

  // ---------------------------------------------------------------------------
  // buildPacket
  // ---------------------------------------------------------------------------
  function buildPacket(input) {
    var opts = input || {};
    var core = opts.core, loader = opts.loader, wordlist = opts.wordlist || null;
    if (!core || typeof core.soundAnalysis !== 'function') return Promise.reject(new Error('buildPacket needs core (createWordSoundsCore)'));
    if (!loader || typeof loader.lessonFromPack !== 'function' || typeof loader.buildHtml !== 'function') return Promise.reject(new Error('buildPacket needs loader (AlloWordSoundsTakeHome)'));
    var seed = opts.seed == null ? 1 : opts.seed;
    var title = String(opts.title || 'Word Sounds practice').trim().slice(0, 120);
    var exceptions = [];
    var except = function (word, activity, reason) { exceptions.push({ word: word, activity: activity, reason: reason }); };
    var asked = (Array.isArray(opts.words) ? opts.words : String(opts.words || '').split(/[\s,]+/)).map(function (w) { return String(w || '').trim().toLowerCase(); }).filter(Boolean);
    var askedActivities = (Array.isArray(opts.activities) && opts.activities.length ? opts.activities : ['isolation']).map(String).filter(function (id, i, all) { return all.indexOf(id) === i; });
    var adapters = loader.ADAPTERS || {};
    var activities = askedActivities.filter(function (id) {
      if (SUPPORTED.indexOf(id) >= 0 && adapters[id]) return true;
      except(null, id, adapters[id] ? 'this activity cannot be built without AI or a teacher yet' : 'unknown activity');
      return false;
    });
    var audio = createAudio(opts.banks, opts.speak, opts.toWav, !!opts.allowUnconverted);
    var blocked = function (word) { return !!wordlist && typeof wordlist.isBlocked === 'function' && wordlist.isBlocked(word); };
    // Answer choices come from the app's own word lists. Blocked words leave that pool, and so do
    // words nobody can say aloud here (no clip and no speak), so a choice is never silent.
    var known = opts.knownWords || (wordlist ? wordlist.rows().filter(function (row) { return row.known; }).map(function (row) { return row.word; }) : []);
    var probeLogic = createPackLogic({ core: core, knownWords: known, seed: seed });
    var choicePool = Array.from(probeLogic.k2KnownWords()).filter(function (word) {
      return !blocked(word) && (typeof opts.speak === 'function' || audio.hasClip('words', core.packAudioKey(word)));
    });
    var logic = createPackLogic({ core: core, knownWords: choicePool, seed: seed });
    var limit = typeof opts.length === 'number' ? opts.length : LENGTHS[opts.length] || 40;
    var words = [];
    asked.forEach(function (word) {
      if (words.indexOf(word) >= 0) return;
      if (blocked(word)) return except(word, null, 'this word is on the blocklist');
      if (logic.isUnusableAsPhonicsWord(word)) return except(word, null, 'not a usable practice word (letters only, 2 to 10 letters, with a vowel)');
      if (!core.dictionarySounds(word)) return except(word, null, 'not in the sound dictionary');
      if (words.length >= limit) return except(word, null, 'over the length asked for (' + limit + ' words)');
      words.push(word);
    });

    var rows = [];
    var prepare = words.reduce(function (chain, word, index) {
      return chain.then(function () {
        return logic.preparePackWordAiFree({ word: word, index: index, batchWords: words, isEnglish: true, estimate: logic.estimatePackPhonemes });
      }).then(function (row) { if (row && row.phonemeSource === 'dictionary') rows.push(row); else except(word, null, 'not in the sound dictionary'); });
    }, Promise.resolve());

    return prepare.then(function () {
      logic.compileActivityItems(rows);
      rows.forEach(function (item) {
        item.activityItems = Object.fromEntries(Object.entries(item.activityItems || {}).filter(function (pair) { return activities.indexOf(pair[0]) >= 0; }));
        item._preparedActivities = activities;
        // Last guard: a blocked word on a board removes that board.
        activities.forEach(function (id) {
          var bad = boardWords(id, item.activityItems[id]).filter(blocked);
          if (bad.length) { delete item.activityItems[id]; except(item.word, id, 'an answer choice is on the blocklist'); }
        });
        if (item.activityItems.mapping && suspectSplit(wordUnits(core, item.word, item.phonemes))) {
          delete item.activityItems.mapping;
          except(item.word, 'mapping', 'the spelling split for this word needs checking');
        }
      });
      // Pass 1: find out which clips the chosen activities ask for.
      var wanted = [];
      var probe = function (category) {
        return new Proxy({}, { get: function (_, key) {
          if (typeof key !== 'string') return undefined;
          if (category !== 'words' && !audio.hasClip(category, key)) return undefined;
          if (wanted.indexOf(category + '|' + key) < 0) wanted.push(category + '|' + key);
          return 'data:audio/x-probe;base64,' + category + '|' + encodeURIComponent(key);
        } });
      };
      var lessonOptions = function (banks) {
        return { core: core, banks: banks, isEnglish: true, showLetters: !!opts.showLetters, activities: activities, title: title,
          lessonId: 'pb-' + hex8(fnv1a(JSON.stringify([VERSION, String(seed), title, words, activities]))) };
      };
      if (!activities.length || !rows.length) return { wanted: wanted, lessonOptions: lessonOptions };
      loader.lessonFromPack(rows, lessonOptions({ words: probe('words'), phonemes: probe('phonemes'), isolation: probe('isolation'), instructions: probe('instructions') }));
      return wanted.reduce(function (chain, id) {
        var at = id.indexOf('|');
        return chain.then(function () { return audio.resolve(id.slice(0, at), id.slice(at + 1)); });
      }, Promise.resolve()).then(function () { return { wanted: wanted, lessonOptions: lessonOptions }; });
    }).then(function (state) {
      // Pass 2: build with the clips that exist. Whatever lacks one is left out and listed.
      var banks = { words: {}, phonemes: {}, isolation: {}, instructions: {} };
      var byUri = {};
      state.wanted.forEach(function (id) {
        var f = audio.found[id];
        if (!f || f.status !== 'ready') return;
        banks[f.category][f.key] = f.uri;
        if (!byUri[f.uri]) byUri[f.uri] = f;
      });
      var built = activities.length && rows.length ? loader.lessonFromPack(rows, state.lessonOptions(banks)) : { lesson: null, exceptions: [], perActivity: [] };
      var already = {};
      exceptions.forEach(function (e) { already[e.activity + '|' + e.word] = true; });
      built.exceptions.forEach(function (e) {
        if (already[e.activity + '|' + e.word]) return;
        var codes = Array.isArray(e.missing) && e.missing.length ? e.missing : ['board'];
        var reasons = [];
        codes.forEach(function (code) {
          var f = audio.found['words|' + core.packAudioKey(e.word)];
          var reason = code === 'word'
            ? (f && f.status === 'needs_converter' ? 'the recording for this word is WebM and no converter was supplied'
              : f && f.status === 'convert_failed' ? 'the recording for this word could not be converted to WAV' : 'no recording for this word')
            : plainReason(e.activity, String(code), audio);
          if (reason && reasons.indexOf(reason) < 0) reasons.push(reason);
        });
        except(e.word, e.activity, reasons.join('; '));
      });
      var lesson = built.lesson && built.lesson.blocks && built.lesson.blocks.length ? built.lesson : null;
      var clips = [], bySource = {};
      if (lesson) {
        lesson.createdAt = typeof opts.createdAt === 'string' ? opts.createdAt : '';
        Object.keys(lesson.audio).forEach(function (id) {
          var f = byUri[lesson.audio[id]] || {};
          var kind = f.category === 'words' ? 'word' : f.category === 'phonemes' ? 'sound' : f.category === 'isolation' ? 'position question' : 'instruction';
          clips.push({ id: id, kind: kind, key: f.key || '', source: f.source || 'unknown', format: f.format || '' });
          bySource[f.source || 'unknown'] = (bySource[f.source || 'unknown'] || 0) + 1;
        });
      }
      var byActivity = {};
      activities.forEach(function (id) { byActivity[id] = 0; });
      if (lesson) lesson.blocks.forEach(function (block) { byActivity[block.activity] = block.items.length; });
      var usedWords = lesson ? words.filter(function (word) { return lesson.blocks.some(function (block) { return block.items.some(function (item) { return String(item.word).toLowerCase() === word; }); }); }) : [];
      words.forEach(function (word) {
        if (usedWords.indexOf(word) < 0 && !exceptions.some(function (e) { return e.word === word && e.activity === null; })) except(word, null, 'no activity could be built for this word');
      });
      var notices = [{ id: 'cmudict', name: 'Carnegie Mellon Pronouncing Dictionary', text: CMUDICT_NOTICE }];
      var attributions = ATTRIBUTIONS.filter(function (line, index) { return index === 0 || (index === 1 ? bySource[SOURCE_NAMES.kokoro] || bySource[SOURCE_NAMES.spoken] : bySource[SOURCE_NAMES.recorded]); });
      var manifest = {
        kind: 'alloflow-packet-build-manifest', builder: VERSION, seed: seed, title: title,
        learnerLabel: opts.learnerLabel ? String(opts.learnerLabel).trim().slice(0, 60) : '',
        packet: lesson ? { id: lesson.lessonId, version: lesson.revision } : null,
        words: { asked: asked, used: usedWords },
        activities: { asked: askedActivities, built: Object.keys(byActivity).filter(function (id) { return byActivity[id] > 0; }) },
        items: { total: Object.keys(byActivity).reduce(function (n, id) { return n + byActivity[id]; }, 0), byActivity: byActivity },
        exceptions: exceptions,
        audio: { clips: clips.length, bySource: bySource, list: clips },
        safety: wordlist ? 'words and answer choices were checked against the blocklist (a first pass that needs human review)' : 'no word list was supplied: nothing was checked against the blocklist',
        choice: opts.picked && opts.picked.criteria ? opts.picked.criteria : null,
        ai: 'none', attributions: attributions, notices: notices, creditsInFile: false,
      };
      if (opts.picked && opts.picked.criteria && opts.picked.criteria.stage) manifest.stageNote = STAGE_NOTE;
      if (manifest.learnerLabel) manifest.openWith = '#learner=' + encodeURIComponent(manifest.learnerLabel);
      if (!lesson) return { html: '', lesson: null, manifest: manifest, exceptions: exceptions, sha256: '' };
      var html = loader.buildHtml(lesson, { core: core, attributions: attributions });
      var credited = withCredits(html, { attributions: attributions, notices: notices,
        builder: { name: VERSION, seed: seed, ai: 'none', words: usedWords.length, items: manifest.items.total } });
      manifest.creditsInFile = credited.done;
      var digest = typeof loader.sha256 === 'function' ? loader.sha256(credited.html) : null;
      return { html: credited.html, lesson: lesson, manifest: manifest, exceptions: exceptions, sha256: digest ? digest.hex : '' };
    });
  }

  // ---------------------------------------------------------------------------
  // pickWords
  // ---------------------------------------------------------------------------
  // The stage table is DATA, not code: data/word_sounds_stages_en.json, with the document that
  // places each group of letter-sound units at its stage. word_sounds_wordlist_en.js carries a copy
  // (wordlist.stages) so a page needs no fetch; a caller may pass another table as context.stages.
  // A unit is "letters>sound" as core.soundAnalysis aligns them; "/pattern" marks a long vowel
  // written with one letter (silent_e, open_syllable, y_as_vowel, single_letter).
  // STAGE_IDS names the rows of the default (US, Common Core) table; a test keeps it equal to the data.
  var STAGE_IDS = ['K early', 'K late', 'G1 early', 'G1 late', 'G2', 'G3+'];
  var STAGE_NOTE = 'Stage rows follow the grade placements of the Common Core Reading Foundational Skills standards where the standards give one, ' +
    'and common classroom practice where they do not; the stage table says which. A row marked PROVISIONAL has not been checked against a source document.';
  var VOWEL_LABELS = 'a e i o u ay ee ie oa oo oo_short oy ow aw ar or er ir ur air ear schwa'.split(' ');
  var LONG_VOWELS = { ay: true, ee: true, ie: true, oa: true, oo: true };
  var compiledTables = [];
  // Turns the data table into one lookup per stage. Each stage holds its own units and those of the rows before it.
  function compileStages(table) {
    if (!table || !Array.isArray(table.frameworks)) return null;
    for (var k = 0; k < compiledTables.length; k++) if (compiledTables[k].table === table) return compiledTables[k].compiled;
    var compiled = { byId: {}, list: [] };
    table.frameworks.forEach(function (framework) {
      var units = {}, anyUnit = false;
      (framework.stages || []).forEach(function (stage) {
        var bases = {}, sources = 0;
        (stage.groups || []).concat(stage.limits ? [stage.limits] : []).forEach(function (group) {
          if (group.basis) bases[group.basis] = true;
          sources += (group.sources || []).length;
        });
        (stage.groups || []).forEach(function (group) {
          String(group.units || '').split(' ').forEach(function (u) { if (u === '*') anyUnit = true; else if (u) units[u] = true; });
        });
        var limits = stage.limits || {}, avoidFinal = {}, mine = {};
        String(limits.avoidFinal || '').split(' ').forEach(function (s) { if (s) avoidFinal[s] = true; });
        Object.keys(units).forEach(function (u) { mine[u] = true; });
        var verified = stage.verified === true;
        var one = { id: stage.id, label: stage.label || stage.id, framework: framework.id, frameworkLabel: framework.label || framework.id,
          isDefault: framework.id === table.defaultFramework, verified: verified,
          basis: bases.standard && bases['common practice'] ? 'standard and common practice' : bases.standard ? 'standard' : 'common practice',
          sources: sources, units: mine, anyUnit: anyUnit, clusters: !!limits.clusters, silentE: !!limits.silentE,
          maxSyllables: limits.maxSyllables > 0 ? limits.maxSyllables : 0, maxSounds: limits.maxSounds > 0 ? limits.maxSounds : 0,
          longVowelsInLongerWords: limits.longVowelsInLongerWords !== false, avoidFinal: avoidFinal, allowBritish: !!framework.allowBritish,
          note: verified ? 'Checked on ' + (table.checked || 'an unrecorded date') + ' against ' + (framework.checkedAgainst || 'the source documents') + '. ' +
            (bases.standard && bases['common practice'] ? 'That document places part of this row at this grade or year; the rest follows common classroom practice, not a standard.'
              : bases.standard ? 'That document places everything in this row at this grade or year.' : 'This row follows common classroom practice, not a standard.')
            : (stage.provisional || 'PROVISIONAL: this stage row has not been checked against a source document.') };
        compiled.byId[String(stage.id).trim().toLowerCase().replace(/\s+/g, ' ')] = one;
        compiled.list.push(one);
      });
    });
    compiledTables.push({ table: table, compiled: compiled });
    return compiled;
  }
  // The table a caller did not pass: the copy inside the word list script, when a page or node has loaded it.
  function defaultStageTable() {
    var loaded = root && root.AlloModules && root.AlloModules.WordSoundsWordlist;
    return loaded && loaded.stages ? loaded.stages : null;
  }
  function stageOf(name, table) {
    var compiled = compileStages(table || defaultStageTable());
    if (!compiled) return null;
    return compiled.byId[String(name || '').trim().toLowerCase().replace(/\s+/g, ' ')] || null;
  }
  // For a page: the rows of a table, in order, with what to print beside each.
  function stageList(table) {
    var compiled = compileStages(table || defaultStageTable());
    return !compiled ? [] : compiled.list.map(function (s) {
      return { id: s.id, label: s.label, framework: s.framework, frameworkLabel: s.frameworkLabel, isDefault: s.isDefault, verified: s.verified, basis: s.basis, note: s.note,
        maxSyllables: s.maxSyllables, maxSounds: s.maxSounds };
    });
  }
  // The word as taught units: [{ letters, sounds, key, vowel, silentE }], or null when it does not align.
  function wordUnits(core, word, sounds) {
    var analysis = core.soundAnalysis(word, sounds);
    if (!analysis || !analysis.chunks || analysis.mapping.status !== 'ready') return null;
    var patterns = {};
    analysis.flags.vowelPatterns.forEach(function (p) { patterns[p.start] = p.pattern; });
    var units = analysis.chunks.map(function (chunk) {
      var letters = chunk.silentE ? chunk.text.slice(0, -1) : chunk.text;
      var mine = sounds.slice(chunk.start, chunk.start + chunk.size);
      var pattern = patterns[chunk.start];
      return { letters: letters, sounds: mine, silentE: !!chunk.silentE, vowel: mine.some(function (s) { return VOWEL_LABELS.indexOf(s) >= 0; }),
        pattern: pattern || '', key: letters + '>' + mine.join('+') + (pattern && pattern !== 'vowel_team' ? '/' + pattern : '') };
    });
    // nose, these, size, face, cage: the aligner gives the final e to the consonant (se, ze, ce, ge) and
    // calls the vowel a lone letter. For a teacher it is the same final-e pattern as make.
    // The aligner also names no pattern for u said as two sounds (cute, music): final e or open syllable.
    units.forEach(function (u, i) {
      var next = units[i + 1];
      var finalE = !!next && !next.vowel && (next.silentE || (next.letters.length === 2 && next.letters.charAt(1) === 'e'));
      var twoSoundU = !u.pattern && u.letters === 'u' && u.sounds.length === 2 && u.vowel;
      if ((u.pattern === 'single_letter' && finalE && !next.silentE) || twoSoundU) {
        u.pattern = twoSoundU && !finalE ? 'open_syllable' : 'silent_e';
        u.key = u.letters + '>' + u.sounds.join('+') + '/' + u.pattern;
      }
    });
    return units;
  }
  // Does the word stay inside the stage: only its units, and inside its length limits?
  function fitsStage(stage, units) {
    if (!units || !units.length || !stage) return false;
    var sounds = 0, syllables = 0, long = false;
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (!stage.anyUnit && !stage.units[u.key]) return false;
      if (u.silentE && !stage.silentE) return false;
      if (!stage.clusters && i > 0 && !u.vowel && !units[i - 1].vowel) return false;
      for (var j = 0; j < u.sounds.length; j++) {
        sounds++;
        if (VOWEL_LABELS.indexOf(u.sounds[j]) >= 0) { syllables++; if (LONG_VOWELS[u.sounds[j]]) long = true; }
      }
    }
    if (stage.maxSounds && sounds > stage.maxSounds) return false;
    if (stage.maxSyllables && syllables > stage.maxSyllables) return false;
    if (stage.longVowelsInLongerWords === false && syllables > 1 && long) return false;
    var last = units[units.length - 1];
    if (stage.avoidFinal && stage.avoidFinal[last.letters === 'x' ? 'x' : last.sounds[last.sounds.length - 1]]) return false;
    return true;
  }
  // The aligner splits shop as s + ho + p (the h goes with the vowel, as in honest). Until that is
  // fixed in word_sounds_core.js, such a split is not shown to a learner.
  function suspectSplit(units) {
    return !!units && units.some(function (u, i) {
      return i > 0 && u.vowel && /^h[aeiouy]/.test(u.letters) && /^[sctpwg]$/.test(units[i - 1].letters) && ['sh', 'ch', 'th', 'dh', 'f', 'w'].indexOf(units[i - 1].sounds[0]) >= 0;
    });
  }
  function atPosition(index, length, position) {
    return position === 'first' ? index === 0 : position === 'last' ? index === length - 1
      : position === 'middle' ? index > 0 && index < length - 1 : true;
  }

  function pickWords(criteria, context) {
    var c = criteria || {}, ctx = context || {};
    var wordlist = ctx.wordlist, core = ctx.core, dictionary = ctx.dictionary;
    if (!wordlist || typeof wordlist.rows !== 'function') throw new Error('pickWords needs wordlist (word_sounds_wordlist_en.js)');
    if (!core || typeof core.soundAnalysis !== 'function') throw new Error('pickWords needs core (createWordSoundsCore)');
    var seed = ctx.seed == null ? 1 : ctx.seed;
    var count = c.count > 0 ? Math.floor(c.count) : 10;
    // Familiar = on the app's own lists, OR common enough in children's books. maxRank (the older
    // reading-library rule) is one more way in, only when the caller passes it or the word list is an
    // old one with no child-book column.
    var hasChildBooks = !!(wordlist.meta && wordlist.meta.childBooks);
    var minZipf = c.minZipf > 0 ? Number(c.minZipf) : DEFAULT_MIN_ZIPF;
    var minBooks = typeof c.minBooks === 'number' && c.minBooks >= 0 ? c.minBooks : DEFAULT_MIN_BOOKS;
    var maxRank = c.maxRank > 0 ? c.maxRank : hasChildBooks ? 0 : DEFAULT_MAX_RANK;
    var requireClip = c.requireClip !== false;
    var stageTable = ctx.stages || wordlist.stages || defaultStageTable();
    var stage = c.stage ? stageOf(c.stage, stageTable) : null;
    if (c.stage && !stageTable) throw new Error('pickWords needs the stage table (wordlist.stages or context.stages) to use a stage');
    if (c.stage && !stage) throw new Error('Unknown stage: ' + c.stage + ' (use ' + compileStages(stageTable).list.map(function (s) { return s.id; }).join(', ') + ')');
    // British spellings and words (colour, mum) are left out unless asked for, or the stage is an England row.
    var allowBritish = c.british === true || (c.british !== false && !!stage && stage.allowBritish);
    var syllables = c.syllables > 0 ? Math.floor(c.syllables) : 0;
    var shape = c.shape ? String(c.shape).toUpperCase() : '';
    var target = c.targetSound ? String(c.targetSound).replace(/^\/|\/$/g, '').trim().toLowerCase() : '';
    var spelling = c.spellingPattern ? String(c.spellingPattern).trim().toLowerCase() : '';
    var position = c.position || 'any';
    var exclude = {};
    (c.exclude || []).forEach(function (w) { exclude[String(w).trim().toLowerCase()] = true; });
    var soundsOf = function (word) {
      var found = dictionary && typeof dictionary.lookup === 'function' ? dictionary.lookup(word)[0] : null;
      if (found && found.length) return Array.prototype.slice.call(found);
      var entry = core.dictionarySounds(word);
      return entry ? entry.sounds : null;
    };
    var reasons = { fitsTheCriteria: 0, blocked: 0, soundsLikeABlockedWord: 0, oneDroppedSoundFromABlockedWord: 0, britishSpellingOrWord: 0, notFamiliarEnough: 0, noRecording: 0, excluded: 0 };
    var pool = [];
    wordlist.rows().forEach(function (row) {
      if (!/^[a-z]{2,10}$/.test(row.word) || !/[aeiouy]/.test(row.word)) return;
      if (c.sounds > 0 && row.sounds !== c.sounds) return;
      if (shape && row.shape !== shape) return;
      if (syllables && row.shape.split('V').length - 1 !== syllables) return;
      var needUnits = !!stage || !!spelling;
      var sounds = target || needUnits ? soundsOf(row.word) : null;
      if ((target || needUnits) && !sounds) return;
      if (target && !sounds.some(function (s, i) { return s === target && atPosition(i, sounds.length, position); })) return;
      if (needUnits) {
        var units = wordUnits(core, row.word, sounds);
        if (!units || suspectSplit(units)) return;
        if (stage && !fitsStage(stage, units)) return;
        if (spelling) {
          var split = /^([a-z])_e$/.exec(spelling);
          var hit = units.some(function (u, i) {
            if (!atPosition(i, units.length, position)) return false;
            return split ? u.letters === split[1] && u.pattern === 'silent_e' : u.letters === spelling;
          });
          if (!hit) return;
        }
      }
      reasons.fitsTheCriteria++;
      if (row.blocked) { reasons.blocked++; return; }
      if (row.nearBlocked) { reasons.soundsLikeABlockedWord++; return; }
      if (c.avoidDroppedSound && row.dropBlocked) { reasons.oneDroppedSoundFromABlockedWord++; return; }
      if (row.british && !allowBritish) { reasons.britishSpellingOrWord++; return; }
      if (!row.known && !(row.zipf >= minZipf && row.books >= minBooks) && !(maxRank > 0 && row.rank > 0 && row.rank <= maxRank)) { reasons.notFamiliarEnough++; return; }
      if (requireClip && !row.hasClip) { reasons.noRecording++; return; }
      if (exclude[row.word]) { reasons.excluded++; return; }
      pool.push(row.word);
    });
    pool.sort();
    var random = mulberry32(seedFor(seed, 'pickWords'));
    var order = pool.slice();
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var swap = order[i]; order[i] = order[j]; order[j] = swap;
    }
    var used = { count: count, sounds: c.sounds || null, shape: shape || null, targetSound: target || null, spellingPattern: spelling || null,
      position: target || spelling ? position : null, stage: stage ? stage.id : null, syllables: syllables || null,
      familiarity: hasChildBooks ? 'on the app lists, or child-book Zipf >= ' + minZipf + ' in >= ' + minBooks + ' books' + (maxRank ? ', or reading-library rank <= ' + maxRank : '')
        : 'on the app lists, or reading-library rank <= ' + maxRank,
      minZipf: hasChildBooks ? minZipf : null, minBooks: hasChildBooks ? minBooks : null, maxRank: maxRank || null, british: allowBritish, requireClip: requireClip, seed: seed };
    if (stage) {
      used.stageLabel = stage.label; used.framework = stage.framework; used.stageVerified = stage.verified; used.stageBasis = stage.basis;
      used.stageNote = stage.note;
    }
    return { words: order.slice(0, count), pool: pool.length, reasons: reasons, criteria: used };
  }

  var api = {
    VERSION: VERSION, SUPPORTED_ACTIVITIES: SUPPORTED.slice(), STAGES: STAGE_IDS.slice(), STAGE_NOTE: STAGE_NOTE,
    DEFAULT_MAX_RANK: DEFAULT_MAX_RANK, DEFAULT_MIN_ZIPF: DEFAULT_MIN_ZIPF, DEFAULT_MIN_BOOKS: DEFAULT_MIN_BOOKS, CMUDICT_NOTICE: CMUDICT_NOTICE,
    buildPacket: buildPacket, pickWords: pickWords, stageList: stageList, pcmToWavUri: pcmToWavUri,
    _internals: { createPackLogic: createPackLogic, mulberry32: mulberry32, seedFor: seedFor, wordUnits: wordUnits, fitsStage: fitsStage, suspectSplit: suspectSplit, stageOf: stageOf, compileStages: compileStages, withCredits: withCredits },
  };
  if (root) root.AlloPacketBuilder = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
