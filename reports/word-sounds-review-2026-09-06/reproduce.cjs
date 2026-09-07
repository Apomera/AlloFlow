const fs = require('node:fs');
const source = fs.readFileSync('word_sounds_module.js', 'utf8');
const between = (a, b) => { const start = source.indexOf(a); const end = source.indexOf(b, start + a.length); if (start < 0 || end < 0) throw Error(a); return source.slice(start, end); };
const sounds = new Function(`
  const React = {useRef: () => ({current:null})};
  ${between('const SAME_PHONEME_CLUSTERS =', 'const PHONEME_KEY_OF =')}
  ${between('const PHONEME_KEY_OF =', '// Resolved at RENDER time')}
  ${between('const SOUND_MATCH_POOL =', 'const RIME_FAMILIES =')}
  ${between('const estimateFirstPhoneme =', '// Word Families: resolve')}
  return {estimateFirstPhoneme, estimateLastPhoneme, computeSoundSortItem};
`)();
const first = ['get','give','girl','gift','goat','of','one','hour'].map(word => ({word, sound: sounds.estimateFirstPhoneme(word)}));
const last = ['cake','bike','home','nose','of','dogs','fox'].map(word => ({word, sound: sounds.estimateLastPhoneme(word)}));
const boards = [
  ['get', ['g','e','t'], {position:'first',phoneme:'g',words:['give','girl','gift']}],
  ['cake', ['k','ay','k'], {position:'last',phoneme:'k',words:['bike','lake','duck']}],
].map(([word, phonemes, data])=>({word,board:sounds.computeSoundSortItem(word,phonemes,data)}));
const difficulty = (history, activity='counting', level=1) => new Function('learnerScopedHistory','wordSoundsActivity','wordSoundsLevel',`
  const React = {useCallback: fn=>fn}; const wordSoundsDifficulty='auto'; const wsIsGradedRow=h=>h && !h.practiceOnly && h.activity!=='letter_tracing';
  ${between('const getEffectiveDifficulty =', 'const categorizedPool =')}
  return getEffectiveDifficulty();
`)(history,activity,level);
const hist=(n,extra={})=>Array.from({length:n},(_,i)=>({word:'cat',activity:'counting',correct:true,attempts:1,...extra}));
const adaptation = {threeSuccesses:difficulty(hist(3)),threeAacSuccesses:difficulty(hist(3,{aacAssisted:true})),newActivityAfterThreeSuccesses:difficulty(hist(3),'segmentation'),sameRepeatedWord:difficulty(hist(10))};
console.log(JSON.stringify({first,last,boards,adaptation},null,2));
const setup = fs.readFileSync('word_sounds_setup_source.jsx', 'utf8');
const setupBetween = (a,b) => { const start=setup.indexOf(a); const end=setup.indexOf(b,start+a.length); if(start<0||end<0) throw Error(a); return setup.slice(start,end); };
const compiler = new Function(`
  const wordSoundsLanguage='en'; const window={AlloModules:{AlloData:{}}};
  ${setupBetween('const PACK_COMMON_WORDS =', '// ── eSpeak G2P')}
  ${setupBetween('const normalizePackKey =', 'const handleStart =')}
  return {compileActivityItems,estimatePackPhonemes,packSentenceIsUsable};
`)();
const savedRandom = Math.random;
Math.random = () => 0.5;
const items = compiler.compileActivityItems([{word:'cat',phonemes:['k','a','t']},{word:'cap',phonemes:['k','a','p']},{word:'cup',phonemes:['k','u','p']},{word:'kit',phonemes:['k','i','t']},{word:'dog',phonemes:['d','o','g']}]);
Math.random = savedRandom;
console.log(JSON.stringify({compiledCatBoard:items[0].activityItems.sound_sort,catEstimate:compiler.estimatePackPhonemes('cat'),compiledSentence:items[0].activityItems.read_sentence,compiledStory:items[0].activityItems.read_passage,jetBoard:sounds.computeSoundSortItem('jet',['j','e','t'],{position:'first',phoneme:'j',words:['get','give','girl','gift']})},null,2));
for (const target of ['jet','jam','jug','jog','gem','gym','giant','giraffe','jelly','jacket']) {
 const board=sounds.computeSoundSortItem(target,target === 'jug' ? ['j','u','g'] : ['j'],{position:'first',phoneme:'j',words:['get','give','girl','gift']});
 const wrong=board.options.filter(w=>['get','give','girl','gift'].includes(w));
 if(wrong.length) console.log(JSON.stringify({target,board,wrongMatches:wrong}));
}

