import {describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {core, coreSource, compileWords} from './helpers/word_sounds_core.js';

const setup = readFileSync('word_sounds_setup_source.jsx','utf8');
const between = (start,end) => {
  const a=setup.indexOf(start), b=setup.indexOf(end,a+start.length);
  if(a<0||b<0)throw Error('Missing source boundary '+start);
  return setup.slice(a,b);
};
function withCurrentCore(source) {
  return source.replace(/\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/,
    '// BEGIN GENERATED WORD SOUNDS CORE\n'+coreSource+'\nconst WS_CORE=createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE');
}
function api(file, name) {
  const module={exports:{}}, window={};
  new Function('module','window',withCurrentCore(readFileSync(file,'utf8')))(module,window);
  return window[name] || module.exports;
}
const DI=api('word_sounds_di_loader.js','AlloWordSoundsDI');
const readiness=api('word_sounds_readiness_contract.js','unused');

// Actual pinned espeak-ng@1.0.2 output captured through the current loader.
// Tests do not download or execute a provider; production normalization,
// object construction, preparation adapter and compiler execute here.
const ipa={rainy:['r','eɪ','n','i'],happy:['h','æ','p','i'],snowy:['s','n','oʊ','i'],
  light:['l','aɪ','t'],night:['n','aɪ','t'],food:['f','u','d'],good:['g','ʊ','d']};
function helpers(responses=ipa) {
  const window={};
  new Function('window','console',readFileSync('phonics_g2p_loader.js','utf8'))(window,{log(){}});
  window.AlloPhonics.toPhonemes=vi.fn(async word=>responses[word] ? {ipa:responses[word]} : null);
  // Leave the losing timeout pending without creating a real five-second timer.
  const functions=new Function('window','WS_CORE','setTimeout',
    between('const PACK_COMMON_WORDS =','// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY')+
    ';return {espeakPackPhonemes,derivePackRhyme,preparePackRhyme};')(window,core,()=>0);
  return {...functions,phonics:window.AlloPhonics};
}
const sounds = word => ({word,phonemes:ipa[word].map(value=>({ipa:value}))});

describe('pronunciation survives preparation and compiled delivery',()=>{
  it('retains real rainy pronunciation and its y spelling through isolation, segmentation, Sound Sort, and DI',async()=>{
    const h=helpers(), rainy={word:'rainy',phonemes:await h.espeakPackPhonemes('rainy','en')};
    const happy={word:'happy',phonemes:await h.espeakPackPhonemes('happy','en')};
    const snowy={word:'snowy',phonemes:await h.espeakPackPhonemes('snowy','en')};
    expect(rainy.phonemes.at(-1)).toEqual({ipa:'i',grapheme:'y'});
    const compiled=compileWords([rainy,happy,snowy,{word:'bee',phonemes:['b','ee']},{word:'cat',phonemes:['k','a','t']}]);
    const board=compiled[0].activityItems;
    expect(board.isolation).toMatchObject({position:3,correctSound:'ee'});
    expect(board.segmentation.chips.filter(chip=>!chip.isDistractor).map(chip=>chip.phoneme).sort()).toEqual(['ay','ee','n','r']);
    expect(board.sound_sort).toMatchObject({mode:'last',targetChar:'ee'});
    expect(core.validSoundBoard(board.sound_sort,'rainy',[...compiled,...core.knownWords])).toBe(true);
    expect(board.sound_sort.distractors).not.toContain('happy');
    expect(board.sound_sort.distractors).not.toContain('bee');
    const exact=core.buildSoundSort({word:'rainy',phonemes:rainy.phonemes,mode:'last',pool:[rainy,happy,snowy,'bee','cat']});
    expect(new Set(exact.options)).toEqual(new Set(['happy','snowy','bee']));
    expect(compiled[0].graphemes.join('')).toBe('rainy');
    expect(DI.presenterLines('isolation',compiled[0],{language:'en',words:compiled}).model).toContain('/ee/');
  });

  it('rejects incomplete or non-reconstructing grapheme alignment',async()=>{
    const h=helpers();
    h.phonics.buildPhonemes=()=>({phonemes:[{ipa:'r',grapheme:'r'},{ipa:'i',grapheme:'x'}]});
    expect(await h.espeakPackPhonemes('rainy','en')).toBeNull();
    expect(h.phonics.toPhonemes).toHaveBeenCalledWith('rainy',{lang:'en'});
  });
});

describe('correct rhyme answers require pronunciation or reviewed evidence',()=>{
  it.each([
    ['food','good',false],['head','bead',false],['food','mood',true],['good','wood',true],
    ['one','sun',true],['blue','shoe',true],['though','show',true],['cat','hat',true],
  ])('classifies reviewed pair %s / %s as %s',(word,answer,supported)=>{
    expect(core.rhymePairStatus({word,answer}).supported).toBe(supported);
  });

  it('does not promote spelling matches or unknown multisyllabic stress into positive evidence',()=>{
    expect(core.rhymePairStatus({word:'zood',answer:'food'})).toMatchObject({supported:false,rhymes:null});
    expect(core.rhymePairStatus({word:'food',answer:'mood',phonemes:['f',{},'oo','d']})).toMatchObject({supported:false,rhymes:null});
    expect(core.rhymePairStatus({word:'banana',answer:'bandana',
      phonemes:['b','schwa','n','a','n','schwa'],answerPhonemes:['b','a','n','d','a','n','schwa']})).toMatchObject({supported:false,rhymes:null});
    expect(helpers().derivePackRhyme('food',['food','good'],true)).toBe('');
  });

  it('validates generated supplied answers and fallback candidates rather than preserving a false answer',async()=>{
    const h=helpers();
    expect(await h.preparePackRhyme('food',['f','oo','d'],['food','good'],'good',true,'en')).toMatchObject({answer:'',rejectedAnswer:'good'});
    expect(await h.preparePackRhyme('food',['f','oo','d'],['food','good','mood'],'good',true,'en')).toMatchObject({answer:'mood',source:'derived'});
    const selected=await h.preparePackRhyme('light',['l','ī','t'],['light','night'],'night',true,'en');
    expect(selected).toMatchObject({answer:'night',source:'gemini',pronunciation:{word:'night'}});
    expect(selected.pronunciation.phonemes.map(core.soundKey)).toEqual(['n','ie','t']);
  });

  it('keeps pronunciation evidence in the board through portable save/reopen and teacher script generation',async()=>{
    const h=helpers(), selected=await h.preparePackRhyme('light',['l','ī','t'],['light','night'],'night',true,'en');
    const compiled=compileWords([{word:'light',phonemes:['l','ī','t'],rhymeWord:selected.answer,rhymePronunciation:selected.pronunciation}]);
    expect(compiled[0].activityItems.rhyming.pronunciations).toMatchObject({targetWord:'light',answer:'night',answerPhonemes:['n','ie','t']});
    const portable=readiness.portable({type:'word-sounds',isProbeMode:true,lessonPlanSequence:['rhyming'],data:compiled});
    const saved=JSON.parse(JSON.stringify(portable)).data[0];
    delete saved.rhymePronunciation;
    expect(core.buildRhymeBoard({word:'light',prepared:saved.activityItems.rhyming}).options).toContain('night');
    expect(DI.presenterLines('rhyming',saved,{language:'en',words:[saved]}).model).toMatch(/Light and night rhyme/);
    const changed={...saved,phonemes:['l','a','t']};
    expect(DI.presenterLines('rhyming',changed,{language:'en',words:[changed]})).toBeNull();
  });

  it('blocks false prepared and legacy teacher models while keeping explicit teacher-edited boards authoritative',()=>{
    const falseItem={...sounds('food'),rhymeWord:'good',activityItems:{rhyming:{answer:'good',options:['good','cat']}}};
    const compiled=compileWords([falseItem,sounds('good')]);
    expect(compiled[0].activityItems.rhyming).toMatchObject({supported:false,contentStatus:'teacher_review_required',answer:'',options:[]});
    expect(DI.presenterLines('rhyming',falseItem,{language:'en',words:[falseItem,sounds('good')]})).toBeNull();
    expect(DI.presenterLines('rhyming',{...falseItem,activityItems:undefined},{language:'en',words:[falseItem,sounds('good')]})).toBeNull();
    const analysis=DI.analyzeWordSet(compiled,{language:'en'});
    const script=DI.buildLessonScript(analysis,{activities:[{id:'rhyming',count:1}]});
    expect(DI.scriptToText(script)).not.toMatch(/Food and good rhyme/i);
    const reviewed={answer:'local',options:['local','cat'],teacherEdited:true};
    expect(core.buildRhymeBoard({word:'food',prepared:reviewed})).toEqual(reviewed);
  });
});

function clip(byte,voice='af_heart') {
  const bytes=Buffer.alloc(68);bytes.write('RIFF');bytes.write('WAVE',8);bytes[60]=byte;
  return {mime:'audio/wav',base64:bytes.toString('base64'),provenance:core.packAudioProvenance({resolvedVoice:voice,language:'en-US'},'test')};
}
describe('regenerated pack audio replaces canonical aliases',()=>{
  it('replaces later raw aliases across buckets and exposes the same new clip to playback and inventory',()=>{
    const old=clip(1), newer=clip(2,'bf_emma'), retained=clip(3);
    const words=[{word:'apple',_ttsAssets:{apple:old,' APPLE ':old,'  as   in ':retained}},
      {word:'pear',_ttsAssets:{'Apple ':old,pear:retained}}];
    const before=structuredClone(words);
    const updated=core.replacePackAssets(words,{' APPLE ':newer});
    expect(Object.keys(updated[0]._ttsAssets).filter(key=>core.packAudioKey(key)==='apple')).toEqual(['apple']);
    expect(core.packAudioAssets(updated).apple).toBe(newer);
    expect(core.packAudioAssets(updated)['as in']).toBe(retained);
    const inventory=core.packAudioInventory(updated,'bf_emma','en-US');
    expect(inventory.find(row=>row.key==='apple')).toMatchObject({asset:newer,voiceMismatch:false,present:true});
    expect(updated[1]._ttsAssets).toBeUndefined();
    expect(words).toEqual(before);
  });

  it('invalidates a count approved against the old winning alias and preserves unchanged approvals',()=>{
    const old=clip(1), next=clip(2);
    const approval=core.createReviewedSyllableCount({targetWord:'apple',language:'en-US',count:2,reviewed:true,revision:1,
      audioContext:core.createSyllableCountAudioContext({asset:old,language:'en-US'})});
    const words=[{word:'apple',activityItems:{syllable_counting:approval},_ttsAssets:{apple:old,' APPLE ':old}}];
    expect(core.replacePackAssets(words,{apple:{...old}})[0].activityItems.syllable_counting.supported).toBe(true);
    expect(core.replacePackAssets(words,{'Apple ':next})[0].activityItems.syllable_counting).toMatchObject({supported:false,reason:'count_audio_changed'});
    expect(core.packAudioAssets(core.replacePackAssets(words,{apple:{mime:'audio/wav',base64:'broken'}})).apple).toBe(old);
  });
});
