const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
function runRhymeSessionRegressions(coreSource, runtimeSource) {
  const core = new Function(coreSource + '\nreturn createWordSoundsCore();')();
  const common = ['cat','dog','sun','map','bed','pig','cup','hat','fish','star','tree','frog','duck','book','run','red','sit','fan','hop','moon','pen','top','ring','rock','look','mug','cut'];
  const args = {word:'cat',answer:'hat',phonemes:['k','a','t'],pool:[{word:'cut',phonemes:['k','u','t']}, ...common]};
  const groups = [];
  const test = (name, fn) => { fn(); groups.push(name); };
  test('rotates nearby contrasts across repeated presentations without introducing rhymes', () => {
    const session = core.createRhymeSession();
    const boards = Array.from({length:12}, (_,occurrenceId) => core.buildSessionRhymeBoard({...args,session,occurrenceId}));
    const distractors = boards.map(b => b.options.filter(w => w !== b.answer));
    assert.ok(new Set(distractors.flat()).size >= 16);
    assert.ok(distractors.slice(1).every((board,i) => board.filter(w => distractors[i].includes(w)).length <= 1));
    boards.forEach(b => { assert.equal(b.options.length,5); assert.equal(new Set(b.options).size,5); assert.ok(b.options.includes('hat')); assert.ok(!b.options.includes('cat')); });
    assert.ok(boards[0].options.includes('cut'), 'first board retains strong contrast');
  });
  test('replayed/StrictMode occurrence returns an independent stable board and counts once', () => {
    const session = core.createRhymeSession();
    const board = core.buildSessionRhymeBoard({...args,session,occurrenceId:'first'});
    const counts = [...session.counts];
    for(let i=0;i<5;i++) {
      const again = core.buildSessionRhymeBoard({...args,session,occurrenceId:'first'});
      assert.deepEqual(again,board); assert.notEqual(again.options,board.options);
    }
    board.options.push('mutation');
    assert.ok(!core.buildSessionRhymeBoard({...args,session,occurrenceId:'first'}).options.includes('mutation'));
    assert.deepEqual([...session.counts],counts); assert.equal(session.recent.length,1);
  });
  test('prepared and subsequently teacher-edited boards stay exact and never double count', () => {
    const session = core.createRhymeSession();
    const prepared = {answer:'bat',options:['mug','bat','red','fan','pig','cup'],teacherEdited:true,custom:'keep'};
    assert.deepEqual(core.buildSessionRhymeBoard({...args,session,occurrenceId:0,prepared}),prepared);
    const counts=[...session.counts];
    const edited={...prepared,options:['mug','bat','red','pen']};
    assert.deepEqual(core.buildSessionRhymeBoard({...args,session,occurrenceId:0,prepared:edited}),edited);
    assert.deepEqual([...session.counts],counts);
    assert.ok(!session.counts.has('bat'));
    core.buildSessionRhymeBoard({...args,session,occurrenceId:1,prepared});
    assert.equal(session.counts.get('mug'),2);
  });
  test('fresh sessions compile the same sequence deterministically', () => {
    const generate = () => {const session=core.createRhymeSession();return Array.from({length:8},(_,occurrenceId)=>core.buildSessionRhymeBoard({...args,session,occurrenceId}));};
    assert.deepEqual(generate(),generate());
    assert.deepEqual(generate()[0],core.buildRhymeBoard(args));
  });
  test('missing data is not cached or counted and can recover in the same occurrence', () => {
    const session=core.createRhymeSession();
    assert.deepEqual(core.buildSessionRhymeBoard({...args,answer:'',session,occurrenceId:0}).options,[]);
    assert.equal(session.occurrences.size,0);
    assert.equal(core.buildSessionRhymeBoard({...args,session,occurrenceId:0}).options.length,5);
    assert.equal(session.occurrences.size,1);
  });
  test('a regenerated answer replaces a cached board in the same occurrence without double counting', () => {
    const session=core.createRhymeSession();
    core.buildSessionRhymeBoard({...args,session,occurrenceId:0});
    const counts=[...session.counts];
    const changed=core.buildSessionRhymeBoard({...args,answer:'bat',session,occurrenceId:0});
    assert.equal(changed.answer,'bat'); assert.ok(changed.options.includes('bat'));assert.ok(!changed.options.includes('hat'));
    assert.deepEqual([...session.counts],counts);
  });
  test('scarce safe vocabulary remains usable after repeated exposure without fabricated choices', () => {
    const session=core.createRhymeSession();
    for(let occurrenceId=0;occurrenceId<8;occurrenceId++) {
      const b=core.buildSessionRhymeBoard({word:'cat',answer:'hat',pool:['dog','sun'],session,occurrenceId});
      assert.deepEqual(new Set(b.options),new Set(['hat','dog','sun']));
    }
  });
  test('usage pressure never admits alternate-spelling rhymes or long filler', () => {
    const session=core.createRhymeSession();
    for(const word of common) session.counts.set(word,99);
    const b=core.buildSessionRhymeBoard({word:'one',answer:'fun',phonemes:['w','u','n'],pool:common,distractors:['sun','psychology','octopus'],session,occurrenceId:0});
    assert.ok(!b.options.includes('sun')); assert.ok(!b.options.includes('psychology')); assert.ok(!b.options.includes('octopus'));
  });
  const start=runtimeSource.lastIndexOf('          const currentWord = currentWordSoundsWord || wordSoundsPhonemes?.word;',runtimeSource.indexOf('// Keep-existing-board check FIRST:'));
  const correctAt=runtimeSource.indexOf('const correctRhyme =',start);
  const end=runtimeSource.indexOf('          } else {',correctAt);
  assert.ok(start>=0 && end>start);
  const effect=new Function('currentWordSoundsWord','wordSoundsPhonemes','lastWordForRhyming','rhymeOptions','setRhymeOptions','preloadedWords','wsLangCaps','WS_CORE','debugLog','advanceEpochRef','rhymePresentationRef','rhymeSessionRef','lastRhymeOccurrenceRef',runtimeSource.slice(start,end)+'\n          }');
  function harness() {
    const epoch={current:1},presentation={current:0},session={current:core.createRhymeSession()},last={current:null},occurrence={current:null};
    const installed=[]; let options=[];
    return {epoch,presentation,session,last,occurrence,installed,
      invoke(word='cat',data={word:'cat',rhymeWord:'hat',phonemes:['k','a','t']}, staleOptions=options) {
        effect(word,data,last,staleOptions,b=>{options=b;installed.push(b);},common,{isEnglish:true},core,()=>{},epoch,presentation,session,occurrence);
      }};
  }
  test('actual runtime effect is idempotent with stale render state then rotates a new same-word presentation', () => {
    const h=harness(); h.invoke(); const first=h.installed[0];
    h.invoke('cat',undefined,[]); // StrictMode second setup sees prior render state.
    assert.deepEqual(h.installed[1],first); assert.equal(h.session.current.occurrences.size,1);
    h.invoke(); assert.equal(h.installed.length,2);
    h.presentation.current++; h.invoke();
    assert.equal(h.session.current.occurrences.size,2); assert.notDeepEqual(h.installed[2],first);
    h.epoch.current++; h.invoke(); assert.equal(h.session.current.occurrences.size,3);
  });
  test('actual runtime rejects stale word data and records prepared boards exactly', () => {
    const h=harness();h.invoke('dog');assert.equal(h.installed.length,0);assert.equal(h.session.current.occurrences.size,0);
    const prepared={answer:'hat',options:['mug','hat','red'],teacherEdited:true};
    h.invoke('cat',{word:'cat',rhymeWord:'hat',activityItems:{rhyming:prepared}});
    assert.deepEqual(h.installed[0],prepared.options);assert.equal(h.session.current.counts.get('mug'),1);
    h.invoke('cat',{word:'cat',rhymeWord:'hat',activityItems:{rhyming:prepared}},[]);
    assert.equal(h.session.current.counts.get('mug'),1);
  });
  test('actual session reset clears exposure once and does not reuse a prior board', () => {
    const h=harness();h.invoke();const first=h.installed[0];h.presentation.current++;h.invoke();
    const resetStart=runtimeSource.indexOf('        rhymeSessionRef.current = WS_CORE.createRhymeSession();');
    const resetEnd=runtimeSource.indexOf('        sessionQueueRef.current = {};',resetStart);
    assert.ok(resetStart>=0&&resetEnd>resetStart);
    new Function('WS_CORE','rhymeSessionRef','rhymePresentationRef','lastRhymeOccurrenceRef','lastWordForRhyming','setRhymeOptions',runtimeSource.slice(resetStart,resetEnd))(core,h.session,h.presentation,h.occurrence,h.last,()=>{});
    assert.equal(h.session.current.counts.size,0);assert.equal(h.session.current.occurrences.size,0);h.invoke('cat',undefined,[]);assert.deepEqual(h.installed.at(-1),first);
  });
  return groups;
}
module.exports={runRhymeSessionRegressions};
if(require.main===module){
  const root=process.argv[2]||__dirname;
  const groups=runRhymeSessionRegressions(fs.readFileSync(path.join(root,'word_sounds_core.js'),'utf8'),fs.readFileSync(path.join(root,'word_sounds_module.js'),'utf8'));
  console.log(JSON.stringify({passed:groups.length,groups},null,2));
}
