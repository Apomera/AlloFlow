const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const integrated = process.argv.includes('--repo');
const repo = process.env.WORD_SOUNDS_TEST_ROOT || process.cwd();
const read = (name, staged) => fs.readFileSync(integrated ? path.join(repo, name) : path.join(__dirname, staged), 'utf8');
const coreSource = read('word_sounds_core.js', 'syllable-core-candidate.js');
const source = read('word_sounds_setup_source.jsx', 'syllable-setup-candidate.jsx');
const readinessSource = read('word_sounds_readiness_contract.js', 'syllable-readiness-candidate.js');
const context = { console, Buffer, setTimeout, clearTimeout, module: { exports: {} } };
vm.createContext(context);
vm.runInContext(coreSource + '\nglobalThis.core = createWordSoundsCore();', context);
const core = context.core;
const plain = x => JSON.parse(JSON.stringify(x));
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }

test('bounded inventory contains only two pronounceable component words per target', () => {
  assert.ok(core.syllableWords().length >= 50);
  for (const word of core.syllableWords()) {
    const task = core.resolveSyllableTask(word, null, 'en-US');
    assert.equal(task.syllables.length, 2);
    assert.equal(task.syllables.join(''), word);
    assert.equal(core.syllableReady(task), true);
    assert.equal(task.audioUnits.every(unit => /^[a-z]+$/.test(unit.key) && unit.key === unit.text), true);
  }
  for (const word of ['rainbow', 'windmill', 'sunflower', 'butterfly', 'banana']) assert.equal(core.resolveSyllableTask(word, null, 'en').supported, false);
});
test('unsupported words and languages cannot silently become spelling-chunk stimuli', () => {
  assert.equal(core.resolveSyllableTask('banana', { syllables: ['ba', 'na', 'na'] }, 'en').supported, false);
  assert.equal(core.resolveSyllableTask('sunset', null, 'es').supported, false);
  assert.equal(core.resolveSyllableTask('constructor', null, 'en').supported, false);
});
test('English display names and locale codes use the same supported inventory', () => {
  for (const language of ['', 'en', 'en-US', 'en_GB', ' English ', 'English (United States)']) {
    assert.equal(core.resolveSyllableTask('sunset', null, language).supported, true, language);
  }
  for (const language of ['es', 'French', 'enjoy']) assert.equal(core.isSyllableLanguageSupported(language), false, language);
});
test('legacy guessed divisions are replaced by the curated word-level task', () => {
  const task = core.resolveSyllableTask(' SunSet ', { syllables: ['suns', 'et'] }, 'en');
  assert.deepEqual(plain(task.syllables), ['sun', 'set']);
  assert.deepEqual(plain(task.audioUnits), [{ key: 'sun', text: 'sun' }, { key: 'set', text: 'set' }]);
});
test('readiness rejects modified or legacy unit metadata', () => {
  const task = plain(core.resolveSyllableTask('sunset', null, 'en'));
  assert.equal(core.syllableReady({ ...task, audioUnits: [{key:'sun',text:'sun'},{key:'et',text:'et'}] }), false);
  assert.equal(core.syllableReady({ ...task, syllables: ['suns', 'et'] }), false);
  assert.equal(core.syllableReady({ syllables: ['sun', 'set'], answer: 'sunset' }), false);
});
test('portable boards require distinct answer choices including the target', () => {
  const task = plain(core.resolveSyllableTask('sunset', null, 'English'));
  assert.equal(core.validSyllableBoard({...task,options:['sunset','raincoat']}), true);
  for (const options of [[], ['sunset'], ['sunset','sunset'], ['raincoat','bedtime'], ['sunset',''], ['sunset',5]]) {
    assert.equal(core.validSyllableBoard({...task,options}), false);
  }
});

const compileStart = source.indexOf('        const compileActivityItems = (items) => {');
const compileEnd = source.indexOf('        const handleStart = async () => {', compileStart);
assert.ok(compileStart >= 0 && compileEnd > compileStart);
const setupContext = {
  WS_CORE: core, packIsEnglish: true, wordSoundsLanguage: 'en', PACK_COMMON_WORDS: ['cat','dog','fish','hat'],
  normalizePackKey: value => String(value || '').trim().toLowerCase().replace(/\s+/g,' '),
  flatPackPhoneme: p => typeof p === 'string' ? p : p?.grapheme || p?.ipa || '',
  shuffleForPack: values => [...values].reverse(),
  estimatePackPhonemes: () => [], estimatePackSyllables: word => [word],
  packSentenceIsUsable: () => false, packStoryIsUsable: () => false, splitPackSentence: () => null,
  instructionalProfile: {},
};
const countStart = source.indexOf('        const countSyllables = React.useCallback((word) => {');
const previewStart = source.indexOf('        const previewList = React.useMemo(() => {', countStart);
const previewEnd = source.indexOf('        const syllableBlendingSelected = ', previewStart);
test('Studio counts curated compounds accurately and filters bank preview by the syllable range', () => {
  const check = (min,max,language) => {
    const context = {WS_CORE:core,React:{useCallback:fn=>fn,useMemo:fn=>fn()},includeSyllableWords:true,wordSoundsLanguage:language,syllableRange:{min,max},preloadedWords:[],includeGlossary:false,includeFamily:false,includeCustom:false,includeSightWords:false,includeAI:false,glossaryTerms:[],selectedFamily:'',selectedSightWordList:'',customText:'',aiTerms:[],WORD_FAMILY_PRESETS:{},SIGHT_WORD_PRESETS:{}};
    vm.createContext(context);
    vm.runInContext(source.slice(countStart,previewEnd)+'\nglobalThis.count=countSyllables; globalThis.words=previewList;',context);
    return context;
  };
  const supported = check(2,2,'English');
  for (const word of core.syllableWords()) assert.equal(supported.count(word),2,word);
  assert.equal(supported.words.length,core.syllableWords().length);
  assert.equal(check(1,1,'en').words.length,0);
  assert.equal(check(3,4,'en').words.length,0);
  assert.equal(check(1,4,'es').words.length,0);
});
vm.createContext(setupContext);
vm.runInContext(source.slice(compileStart, compileEnd) + '\nglobalThis.compile = compileActivityItems;', setupContext);
const [prepared, unknown] = setupContext.compile([
  {word:'sunset',phonemes:['s','u','n','s','e','t'],syllables:['suns','et'],syllableBlendingOptions:['banana','cat']},
  {word:'banana',phonemes:[],syllables:['ba','na','na']},
]);
test('actual setup compiler creates a complete valid blending board and ignores model fragments', () => {
  const board = prepared.activityItems.syllable_blending;
  assert.equal(core.syllableReady(board), true);
  assert.deepEqual(plain(board.syllables), ['sun','set']);
  assert.equal(board.options.length, 4);
  assert.equal(new Set(board.options).size, 4);
  assert.equal(board.options.filter(v => v === 'sunset').length, 1);
  assert.equal(board.options.every(v => core.syllableWords().includes(v)), true);
});
test('unsupported blending is blocked while authored counting units remain available', () => {
  assert.equal(unknown.activityItems.syllable_blending.supported, false);
  assert.equal(unknown.activityItems.syllable_blending.options.length, 0);
  assert.equal(unknown.activityItems.syllable_counting.answer, 3);
  assert.deepEqual(plain(unknown.activityItems.syllable_counting.syllables), ['ba','na','na']);
});
const taskStart = source.indexOf('const tasks = new Set([word]);');
const taskEnd = source.indexOf('taskList.forEach((text) => {', taskStart);
assert.ok(taskStart >= 0 && taskEnd > taskStart);
const getTasks = new Function('boards','word','item','WS_CORE','addInstructionParts', source.slice(taskStart, taskEnd) + 'return taskList;');
test('actual setup audio collector packages spoken component keys rather than raw model syllables', () => {
  const tasks = getTasks({syllable_blending:prepared.activityItems.syllable_blending}, 'sunset', {}, core, () => {});
  assert.ok(tasks.includes('sun') && tasks.includes('set'));
  assert.ok(tasks.includes('Listen to the syllables and blend them together'));
  assert.ok(!tasks.includes('suns') && !tasks.includes('et'));
  const blocked = getTasks({syllable_blending:unknown.activityItems.syllable_blending}, 'banana', {}, core, () => {});
  assert.ok(!blocked.includes('ba') && !blocked.includes('Listen to the syllables and blend them together'));
});
const oldApi = {VERSION:3,portable:()=>{},requirements:()=>{throw new Error('old contract reused');}};
const readContext = { console, Buffer, setTimeout, clearTimeout, module: {exports:{}}, AlloModules: {WordSoundsReadiness:oldApi} };
vm.createContext(readContext);
vm.runInContext(readinessSource, readContext);
const contract = readContext.module.exports;
test('a loaded version 3 readiness API is upgraded to the changed contract', () => {
  assert.equal(contract.VERSION,4);
  assert.notEqual(contract,oldApi);
  assert.equal(readContext.AlloModules.WordSoundsReadiness,contract);
});
const resourceFor = item => ({id:'syllable-test',type:'word-sounds',data:[item],lessonPlanSequence:['syllable_blending'],isProbeMode:true});
test('portable requirements enumerate verified component speech clips', () => {
  const requirements = contract.requirements(resourceFor(prepared));
  assert.deepEqual(plain(requirements.contentIssues), []);
  const keys = requirements.entries.filter(v => v.category === 'speech').map(v => v.key);
  assert.ok(keys.includes('sun') && keys.includes('set'));
  assert.ok(!keys.includes('suns') && !keys.includes('et'));
});
test('missing component audio cannot be mistaken for a ready whole-word recording', () => {
  const report = contract.inspect(resourceFor(prepared));
  assert.equal(report.complete, false);
  assert.ok(report.missingLabels.includes('speech: sun'));
  assert.ok(report.missingLabels.includes('speech: set'));
});
test('legacy guessed data and mismatched word boards are reported as content problems', () => {
  for (const item of [unknown, {word:'sunset',activityItems:{syllable_blending:{syllables:['suns','et'],options:['sunset','dog'],answer:'sunset'}}}, {word:'raincoat',activityItems:{syllable_blending:prepared.activityItems.syllable_blending}}, {word:'sunset',activityItems:{syllable_blending:{...prepared.activityItems.syllable_blending,options:[]}}}]) {
    const report = contract.inspect(resourceFor(item));
    assert.equal(report.complete, false);
    assert.equal(report.status, 'attention');
    assert.equal(report.contentIssues.length, 1);
  }
});
console.log('Passed ' + passed + ' syllable data/compiler/readiness regression groups' + (integrated ? ' against integrated sources.' : ' against staged sources.'));
