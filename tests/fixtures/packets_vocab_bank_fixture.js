// A small stand-in for packets_vocab_bank_en.js (the definition bank another job builds), with the runtime shape
// agreed in C:\tmp\packets_build_1111\vocab\BANK_LAYOUT.md (2026-11-12): window.AlloVocabBank = { version, bytes,
// credits, has, load, senses, sense, words }. The meanings here are written for these tests only.
(function (root) {
  'use strict';
  var S = function (id, def, example, extra) {
    var parts = id.split('|');
    return Object.assign({ id: id, word: parts[0], pos: { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' }[parts[1]], def: def, example: example || '',
      source: 'simple', edited: false, checked: '', common: Number(parts[2]), distractors: [], blanks: [] }, extra || {});
  };
  var SENSES = [
    S('habitat|n|1', 'The natural place where a plant or an animal lives', 'The pond is a habitat for frogs.', { checked: 'good',
      distractors: ['burrow|n|1', 'nest|n|1', 'den|n|1', 'ecosystem|n|1', 'climate|n|1', 'shelter|n|1', 'forest|n|1'], blanks: ['predator', 'camouflage'] }),
    S('predator|n|1', 'An animal that hunts and eats other animals', 'The owl is a predator of mice.', { checked: 'fixed', edited: true,
      distractors: ['herbivore|n|1', 'scavenger|n|1', 'parasite|n|1', 'pet|n|1', 'insect|n|1', 'giant|n|1'] }),
    S('prey|n|1', 'An animal that is hunted and eaten by another animal', 'The mouse is prey for the owl.', {
      distractors: ['herbivore|n|1', 'scavenger|n|1', 'parasite|n|1', 'pet|n|1', 'insect|n|1'] }),
    S('cell|n|1', 'The smallest living part of a plant or an animal', 'Every living thing is made of at least one cell.', { checked: 'good',
      distractors: ['tissue|n|1', 'organ|n|1', 'atom|n|1', 'seed|n|1', 'insect|n|1'] }),
    S('cell|n|2', 'A small room in a jail', 'The prisoner sat in his cell.', { distractors: ['den|n|1', 'shelter|n|1', 'nest|n|1'] }),
    S('cell|n|3', 'A small phone you carry with you', 'Call me on my cell.', { distractors: ['atom|n|1', 'seed|n|1', 'tool|n|1'] }),
    S('bat|n|1', 'A small animal that flies at night and hangs upside down to sleep', 'A bat sleeps in the cave all day.', { checked: 'good',
      distractors: ['owl|n|1', 'insect|n|1', 'pet|n|1', 'giant|n|1'] }),
    S('bat|n|2', 'A stick used to hit a ball', 'She swung the bat and hit the ball.', { distractors: ['tool|n|1', 'seed|n|1'] }),
    S('adapt|v|1', 'To change so that you can live in a new place or way', 'Animals adapt to the cold.', {
      distractors: ['migrate|v|1', 'hibernate|v|1', 'hunt|v|1', 'gather|v|1', 'hide|v|1'] }),
    S('camouflage|n|1', 'Colors or shapes that help an animal hide', 'The moth uses camouflage to look like bark.', {
      distractors: ['shelter|n|1', 'nest|n|1', 'climate|n|1', 'tool|n|1'] }),
    S('burrow|n|1', 'A hole in the ground that an animal digs to live in', 'The rabbit ran into its burrow.'),
    S('nest|n|1', 'A home that a bird builds for its eggs', 'The robin built a nest in the tree.'),
    S('den|n|1', 'The home of a wild animal such as a fox or a bear', 'The fox slept in its den.'),
    S('ecosystem|n|1', 'All the living things in one area and how they live together', 'A pond is an ecosystem.'),
    S('climate|n|1', 'The usual weather of a place over many years', 'The climate here is warm.'),
    S('shelter|n|1', 'A place that keeps you safe from weather or danger', 'We found shelter from the rain.'),
    S('forest|n|1', 'A large area covered with trees', 'Deer live in the forest.'),
    S('herbivore|n|1', 'An animal that eats only plants', 'A cow is a herbivore.'),
    S('scavenger|n|1', 'An animal that eats dead animals it did not kill', 'The crow is a scavenger.'),
    S('parasite|n|1', 'A living thing that lives on another and takes food from it', 'A tick is a parasite.'),
    S('pet|n|1', 'An animal that lives with people in their home', 'My pet is a cat.'),
    S('insect|n|1', 'A small animal with six legs', 'An ant is an insect.'),
    S('giant|n|1', 'A very large person in stories', 'The giant lived in a castle.'),
    S('owl|n|1', 'A bird with big eyes that hunts at night', 'The owl hooted in the dark.'),
    S('tissue|n|1', 'A group of cells that do the same job in a body', 'Muscle is a kind of tissue.'),
    S('organ|n|1', 'A part of the body that does a special job, such as the heart', 'The heart is an organ.'),
    S('atom|n|1', 'The smallest piece of a substance', 'Everything is made of atoms.'),
    S('seed|n|1', 'The small part of a plant that a new plant grows from', 'Plant the seed in the soil.'),
    S('tool|n|1', 'Something you hold in your hand to do a job', 'A hammer is a tool.'),
    S('migrate|v|1', 'To move to another place when the season changes', 'Geese migrate south in the fall.'),
    S('hibernate|v|1', 'To sleep through the winter', 'Bears hibernate in caves.'),
    S('hunt|v|1', 'To chase and catch animals for food', 'Lions hunt at night.'),
    S('gather|v|1', 'To bring things together into one place', 'We gather leaves in the fall.'),
    S('hide|v|1', 'To go where others cannot see you', 'The cat likes to hide under the bed.'),
    S('ancient|adj|1', 'Very old, from a long time ago', 'We saw an ancient castle.', { distractors: ['tiny|adj|1', 'gentle|adj|1'] }),
    S('tiny|adj|1', 'Very small', 'A tiny bug sat on the leaf.'),
    S('gentle|adj|1', 'Kind and calm, not rough', 'Be gentle with the puppy.'),
  ];
  var byId = {}, byWord = {};
  SENSES.forEach(function (s) { byId[s.id] = s; (byWord[s.word] = byWord[s.word] || []).push(s); });
  Object.keys(byWord).forEach(function (w) { byWord[w].sort(function (a, b) { return a.common - b.common; }); });
  var copy = function (s) { return s ? JSON.parse(JSON.stringify(s)) : null; };
  // Base forms: the word, then the word without a plain ending (cats -> cat, hunted -> hunt, hiding -> hide).
  var base = function (word) {
    var w = String(word || '').trim().toLowerCase();
    if (byWord[w]) return w;
    var tries = [w.replace(/ies$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, ''), w.replace(/ed$/, ''), w.replace(/d$/, ''), w.replace(/ing$/, ''), w.replace(/ing$/, 'e')];
    for (var i = 0; i < tries.length; i++) if (byWord[tries[i]]) return tries[i];
    return '';
  };
  var loaded = false;
  var bank = {
    version: 'fixture-2026-11-12',
    bytes: 6000,
    credits: [
      { set: 'Simple English Wiktionary', author: 'Wiktionary contributors', license: 'CC BY-SA 4.0', url: 'https://simple.wiktionary.org/', deed: 'https://creativecommons.org/licenses/by-sa/4.0/' },
      { set: 'Open English WordNet 2025', author: 'Global WordNet Association', license: 'CC BY 4.0', url: 'https://en-word.net/', deed: 'https://creativecommons.org/licenses/by/4.0/' },
    ],
    load: function () { loaded = true; return Promise.resolve(bank); },
    has: function (word) { return loaded && !!base(word); },
    senses: function (word) { var b = loaded ? base(word) : ''; return b ? byWord[b].map(copy) : []; },
    sense: function (id) { return loaded && byId[id] ? copy(byId[id]) : null; },
    words: function () { return loaded ? Object.keys(byWord).sort() : []; },
  };
  root.AlloVocabBank = bank;
  if (typeof module !== 'undefined' && module.exports) module.exports = bank;
})(typeof window !== 'undefined' ? window : globalThis);
