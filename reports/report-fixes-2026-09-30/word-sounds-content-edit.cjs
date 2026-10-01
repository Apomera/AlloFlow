const fs = require('node:fs');
const crypto = require('node:crypto');
const parser = require('@babel/parser');
const directory = __dirname;
const hashes = {
  'word_sounds_core.js': '616de22e05bb3fae5f4c938911cd7e1a05fa842a5b41bf5ae709e2b9a6b1833e',
  'word_sounds_setup_source.jsx': '6e5bef90133f058c28794e603b723b38cce89c59d26a6f80385758966d85e505',
  'word_sounds_module.js': '2c2c8261399da0f9fc4d44796100b78b4e3bf8d1acd9fd4b1791c3669e23e6d3'
};
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const originals = Object.fromEntries(Object.keys(hashes).map(file => [file, fs.readFileSync(file)]));
for (const [file, bytes] of Object.entries(originals)) if (digest(bytes) !== hashes[file]) throw Error('Ownership baseline changed: ' + file);
const sources = Object.fromEntries(Object.entries(originals).map(([file, bytes]) => [file, bytes.toString('utf8').replace(/\r\n/g, '\n')]));
const replace = (file, before, after) => {
  const source = sources[file];
  if (source.split(before).length !== 2) throw Error('Nonunique edit anchor: ' + file + ' ' + before.slice(0, 70));
  sources[file] = source.replace(before, () => after);
};
const region = (file, start, end, next) => {
  const source = sources[file], a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < a || source.indexOf(start, a + 1) >= 0) throw Error('Region anchor: ' + start);
  sources[file] = source.slice(0, a) + next + source.slice(b);
};
const player = 'word_sounds_module.js', setup = 'word_sounds_setup_source.jsx', core = 'word_sounds_core.js';
const tableStart = sources[player].indexOf('      const MANIPULATION_FALLBACKS = {');
const tableEnd = sources[player].indexOf('      // Top up an option set', tableStart);
const table = sources[player].slice(tableStart, tableEnd).replace('const MANIPULATION_FALLBACKS', 'const CURATED_MANIPULATIONS').split('\n').map(line => line.replace(/^      /, '  ')).join('\n');
const helpers = table + `
  // Curated examples are local content, not automatic phoneme validation.
  const resolveManipulationTask = (word, supplied, language) => {
    const target = normalize(word);
    const english = !language || /^en(?:[-_]|$)/i.test(String(language));
    const curated = english && CURATED_MANIPULATIONS[target];
    const matching = !supplied || (curated &&
      ['type', 'instruction', 'targetPhoneme', 'answer'].every(key => supplied[key] === curated[key]) &&
      Array.isArray(supplied.distractors) && supplied.distractors.length >= 2 &&
      supplied.distractors.every(value => curated.distractors.includes(value)) &&
      new Set(supplied.distractors).size === supplied.distractors.length);
    if (curated && matching) return {...curated, distractors: [...curated.distractors], contentStatus: 'curated', targetWord: target};
    return {type: 'review', contentStatus: 'teacher_review_required', targetWord: target,
      instruction: 'Sound Swap is unavailable for this word until a teacher verifies a one-sound change. Choose another activity.',
      answer: '', distractors: []};
  };
  const manipulationReady = task => !!task && task.contentStatus === 'curated';
`;
replace(core, '  return {VERSION,soundKey,', helpers + '  return {resolveManipulationTask,manipulationReady,VERSION,soundKey,');
region(player, '      const MANIPULATION_FALLBACKS = {', '      // Top up an option set', '');
region(player, '      // Pure helper: generates a manipulation task', '      // Stateful wrapper:', `      // Schema-valid AI tasks are drafts; only the local examples can be graded.
      const generateManipulationTask = React.useCallback(
        async (word) => word ? WS_CORE.resolveManipulationTask(word, null, wordSoundsLanguage) : null,
        [wordSoundsLanguage],
      );
`);
replace(player, '            const opts = fisherYatesShuffle(padManipOpts([result.answer, ...(result.distractors || []).slice(0, 5)]));', '            const opts = WS_CORE.manipulationReady(result)\n              ? fisherYatesShuffle(padManipOpts([result.answer, ...(result.distractors || []).slice(0, 5)])) : [];');
replace(player, '        if (!data || !data.instruction) {', `        if (data?.contentStatus === 'teacher_review_required') {
          return React.createElement('p', {role: 'status', className: 'text-center text-slate-700 text-sm py-6'}, data.instruction);
        }
        if (!data || !data.instruction) {`);
replace(player, '        const preloadedTask = preparedManipulation?.task || wordSoundsPhonemes?.manipulationTask;', `        const suppliedTask = wordSoundsPhonemes?.manipulationTask || preparedManipulation?.task;
        const preloadedTask = WS_CORE.resolveManipulationTask(currentWord, suppliedTask, wordSoundsLanguage);`);
region(player, '        if (\n          preloadedTask &&', '        setManipulationState(null);', `        if (preloadedTask) {
          const opts = WS_CORE.manipulationReady(preloadedTask)
            ? fisherYatesShuffle(padManipOpts([preloadedTask.answer, ...preloadedTask.distractors])) : [];
          setManipulationState(preloadedTask);
          manipulationStateRef.current = preloadedTask;
          setManipulationOptions(opts);
          manipulationOptionsRef.current = opts;
          return;
        }
`);
replace(player, '                  const isCorrect =\n                    ans?.toLowerCase() ===\n                    manipulationState?.answer?.toLowerCase();', `                  if (!WS_CORE.manipulationReady(manipulationState)) return;
                  const isCorrect =
                    ans?.toLowerCase() ===
                    manipulationState?.answer?.toLowerCase();`);
region(setup, '        const makePackManipulationFallback =', '        const packTtsSource =', `        const makePackManipulationFallback = (word) => WS_CORE.resolveManipulationTask(word, null, wordSoundsLanguage);
`);
replace(setup, '                const task = item.manipulationTask || makePackManipulationFallback(word, phonemes);\n                item.manipulationTask = task;', `                const task = WS_CORE.resolveManipulationTask(word, item.manipulationTask, wordSoundsLanguage);
                if (!item.manipulationTask) item.manipulationTask = task;`);
replace(setup, '                const manipulation = boardWithAnswer(task.answer, [...(task.distractors || []), ...manipulationFill], 5);', `                const manipulation = WS_CORE.manipulationReady(task)
                    ? boardWithAnswer(task.answer, [...(task.distractors || []), ...manipulationFill], 5) : [];`);
replace(setup, '                 addInstructionParts(tasks, boards.manipulation?.task?.instruction);', '                 if (WS_CORE.manipulationReady(boards.manipulation?.task)) addInstructionParts(tasks, boards.manipulation.task.instruction);');
// Missing examples have no linguistic provenance; do not manufacture noun frames.
replace(setup, `                        : joinPackSentence(
                            READ_SENTENCE_FRAMES[seed % READ_SENTENCE_FRAMES.length].before,
                            word,
                            READ_SENTENCE_FRAMES[seed % READ_SENTENCE_FRAMES.length].after,
                        );`, `                        : '';`);
replace(setup, `                        : [0, 1, 2].map((offset) => {
                            const f = READ_SENTENCE_FRAMES[(seed + offset) % READ_SENTENCE_FRAMES.length];
                            return joinPackSentence(f.before, word, f.after);
                        });`, `                        : [];`);
region(setup, '                        if (seed % 2 === 0) {', '                        // A one-tile board is unwinnable-proof', `                        const smText = packSentenceIsUsable(item.sentence, word, rsSessionWords)
                            ? String(item.sentence).trim() : '';
                        if (smText) {
                            const smUsed = new Set(packSentenceWords(smText));
                            sentenceMatch = {
                                sentence: smText,
                                sequence: [word],
                                extras: shuffleForPack(smOthers.filter((v) => !smUsed.has(v))).slice(0, 2),
                            };
                        }
`);
replace(setup, '                        if (sentenceMatch.sequence.length + sentenceMatch.extras.length < 2) sentenceMatch = null;', '                        if (sentenceMatch && sentenceMatch.sequence.length + sentenceMatch.extras.length < 2) sentenceMatch = null;');
// Preserve valid prepared boards; their provenance and educator review still matter.
region(player, '        const seed = target\n          .split("")\n          .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);\n        const frame = READ_SENTENCE_FRAMES', '      }, [wordSoundsActivity, currentWordSoundsWord, wordSoundsPhonemes,', `        setReadSentenceBoard({contentStatus: 'teacher_review_required'});
`);
region(player, '        const seed = target\n          .split("")\n          .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);\n        const shown = currentWordSoundsWord || target;\n        const parts =', '      }, [wordSoundsActivity, currentWordSoundsWord, wordSoundsPhonemes,', `        setReadPassageBoard({contentStatus: 'teacher_review_required'});
`);
region(player, '        } else {\n          const packMates =', '        // Tile order is shuffled ONCE per board', `        } else {
          board = {contentStatus: 'teacher_review_required'};
        }
`);
replace(player, '        if (board) board.tiles = fisherYatesShuffle([...board.sequence, ...board.extras]);', '        if (board?.sequence) board.tiles = fisherYatesShuffle([...board.sequence, ...board.extras]);');
replace(player, '        setSentenceMatchSlots(board ? board.sequence.map(() => null) : []);', '        setSentenceMatchSlots(board?.sequence ? board.sequence.map(() => null) : []);');
replace(player, '        if (!board) return;\n        // Backfill any tile', '        if (!board?.sequence) return;\n        // Backfill any tile');
replace(player, `              !rsReady
                ? /*#__PURE__*/ React.createElement("p", { className: "text-slate-500 text-sm font-semibold italic" }, ts("word_sounds.read_sentence_preparing") || "Preparing your sentence...")`, `              !rsReady
                ? /*#__PURE__*/ React.createElement("p", { role: 'status', className: "text-slate-700 text-sm font-semibold italic" }, readSentenceBoard?.contentStatus === 'teacher_review_required'
                    ? 'A teacher needs to provide and review a sentence for this word. Choose another activity.'
                    : ts("word_sounds.read_sentence_preparing") || "Preparing your sentence...")`);
// Two other identical placeholders are scoped to their board variables.
replace(player, `              !rpReady
                ? /*#__PURE__*/ React.createElement("p", { className: "text-slate-500 text-sm font-semibold italic" }, ts("word_sounds.read_sentence_preparing") || "Preparing your sentence...")`, `              !rpReady
                ? /*#__PURE__*/ React.createElement("p", { role: 'status', className: "text-slate-700 text-sm font-semibold italic" }, readPassageBoard?.contentStatus === 'teacher_review_required'
                    ? 'A teacher needs to provide and review a story for this word. Choose another activity.'
                    : ts("word_sounds.read_sentence_preparing") || "Preparing your sentence...")`);
replace(player, '(ts("word_sounds.read_sentence_preparing") || "Preparing your sentence..."))', `(sentenceMatchBoard?.contentStatus === 'teacher_review_required'
                        ? 'A teacher needs to provide and review a sentence for this word. Choose another activity.'
                        : (ts("word_sounds.read_sentence_preparing") || "Preparing your sentence...")))`);
for (const [file, source] of Object.entries(sources)) parser.parse(source, {sourceType: 'script', plugins: ['jsx']});
// Fail before any writes if a concurrent writer changed any approved source.
for (const [file, bytes] of Object.entries(originals)) if (digest(fs.readFileSync(file)) !== digest(bytes)) throw Error('Concurrent change: ' + file);
for (const [file, bytes] of Object.entries(originals)) fs.writeFileSync(directory + '/word-sounds-content-before-' + file, bytes);
for (const [file, source] of Object.entries(sources)) {
  const wasCrlf = originals[file].includes(Buffer.from('\r\n'));
  fs.writeFileSync(file, wasCrlf ? source.replace(/\n/g, '\r\n') : source);
}
fs.writeFileSync(directory + '/word-sounds-content-source-edit.json', JSON.stringify({before: hashes, after: Object.fromEntries(Object.keys(sources).map(file => [file, digest(fs.readFileSync(file))])), embeddingRun: false}, null, 2));
console.log('Three scoped sources edited; canonical embedding and mirrors remain root-owned.');
