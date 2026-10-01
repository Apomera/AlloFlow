const fs = require('node:fs');
const crypto = require('node:crypto');
const parser = require('@babel/parser');
const file = 'word_sounds_module.js';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const before = fs.readFileSync(file);
if (hash(before) !== '933aec5cb759acd8e1e54f67adf59ad917a4a04e7f6d7ddfed9e59f0deae9ac3') throw Error('Player changed before skip-route edit');
let source = before.toString('utf8');
const needle = '        switch (wordSoundsActivity) {';
if (source.split(needle).length !== 2) throw Error('Nonunique play-render anchor');
source = source.replace(needle, () => `        const reviewRequired = wordSoundsActivity === 'manipulation'
          ? manipulationState && !WS_CORE.manipulationReady(manipulationState)
          : wordSoundsActivity === 'read_sentence' ? readSentenceBoard?.contentStatus === 'teacher_review_required'
          : wordSoundsActivity === 'read_passage' ? readPassageBoard?.contentStatus === 'teacher_review_required'
          : wordSoundsActivity === 'sentence_match' ? sentenceMatchBoard?.contentStatus === 'teacher_review_required' : false;
        if (reviewRequired) {
          const nextIndex = (activitySequence || []).indexOf(wordSoundsActivity) + 1;
          const nextActivity = nextIndex > 0
            ? (activitySequence || []).slice(nextIndex).find(id => wsActivityAvailableForLang(id)) : null;
          return React.createElement('div', {className: 'flex flex-col items-center gap-4 p-6'},
            React.createElement('p', {role: 'status', className: 'text-slate-700 text-sm text-center'},
              wordSoundsActivity === 'manipulation'
                ? 'Sound Swap needs a teacher to verify a one-sound change for this word. This item will not be scored.'
                : 'A teacher needs to provide and review this reading example. This item will not be scored.'),
            React.createElement('button', {
              type: 'button', className: 'px-4 py-2 rounded-lg bg-violet-700 text-white font-semibold focus:ring-2 focus:ring-violet-400',
              onClick: () => {
                if (nextActivity) {
                  setSequenceIndex((activitySequence || []).indexOf(nextActivity));
                  startActivity(nextActivity);
                } else {
                  setWordSoundsActivity(null);
                }
              }
            }, nextActivity ? 'Skip unscored item and continue' : 'Choose another activity'));
        }
` + needle);
// Unsupported content is settled; it does not need a six-second generation wait.
const oldWait = '                !manipulationOptionsRef.current?.length';
const target = '                !manipulationStateRef.current ||\n' + oldWait;
if (source.split(target).length !== 2) throw Error('Nonunique manipulation wait');
source = source.replace(target, () => '                !manipulationStateRef.current ||\n                (WS_CORE.manipulationReady(manipulationStateRef.current) && !manipulationOptionsRef.current?.length)');
parser.parse(source, {sourceType: 'script'});
if (hash(fs.readFileSync(file)) !== hash(before)) throw Error('Concurrent change during skip route edit');
fs.writeFileSync(__dirname + '/word-sounds-content-before-final-route.js', before);
if (process.argv.includes('--candidate-only')) {
  fs.writeFileSync(__dirname + '/word-sounds-content-final-route-candidate.js', source);
  fs.writeFileSync(__dirname + '/word-sounds-content-final-route-candidate.json', JSON.stringify({before: hash(before), after: hash(Buffer.from(source))}));
  console.log(JSON.stringify({before: hash(before), candidate: hash(Buffer.from(source)), applied: false}));
} else {
  fs.writeFileSync(file, source);
  console.log(JSON.stringify({before: hash(before), after: hash(fs.readFileSync(file))}));
}
