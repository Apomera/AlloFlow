import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { core } from './helpers/word_sounds_core.js';
const source=readFileSync('word_sounds_module.js','utf8');
function callback(name,next,context={}) {
 const start=source.indexOf(`const ${name} =`),end=source.indexOf(`const ${next}`,start);
 if(start<0||end<0)throw Error(name);
 return new Function(...Object.keys(context),`const React={useCallback:fn=>fn}; ${source.slice(start,end)}; return ${name};`)(...Object.values(context));
}
const successes=(activity,mode='sound_only')=>Array.from({length:6},(_,i)=>({activity,mode,word:'word'+i,correct:true,difficulty:'easy',attempts:1}));
function difficulty(context={}) {
 return callback('getEffectiveDifficulty','categorizedPool',{
  WS_CORE:core,wordSoundsDifficulty:'auto',wordSoundsActivity:'counting',
  adaptiveDifficulty:{difficulty:'medium'},learnerScopedHistory:successes('counting'),
  wsIsGradedRow:r=>!r.practiceOnly,aacMode:false,showLetterHints:false,imageVisibilityMode:'smart',getEffectiveTextMode:()=> 'afterAnswer',...context,
 });
}
function queue(entries,fixed=false){
 const sessionQueueRef={current:structuredClone(entries)};
 const take=callback('getAdaptiveRandomWord','[soundChips', {sessionQueueRef,wordSoundsActivity:'counting',isFixedForm:fixed});
 return {take,queues:sessionQueueRef.current};
}
describe('Word Sounds destination activity queues',()=>{
 it('starts an unpractised destination at easy while preserving the current band',()=>{
  const get=difficulty();expect(get()).toBe('medium');expect(get('blending')).toBe('easy');
 });
 it('uses destination evidence and support context',()=>{
  const history=[...successes('blending'),...successes('read_sentence','visual')];
  expect(difficulty({learnerScopedHistory:history})('blending')).toBe('medium');
  expect(difficulty({learnerScopedHistory:history})('read_sentence')).toBe('medium');
  expect(difficulty({learnerScopedHistory:history,aacMode:true})('blending')).toBe('easy');
  expect(difficulty({learnerScopedHistory:history,showLetterHints:true})('blending')).toBe('easy');
 });
 it('retains teacher-selected difficulty',()=>expect(difficulty({wordSoundsDifficulty:'hard'})('blending')).toBe('hard'));
 it('takes from the destination queue before React updates the activity',()=>{
  const {take,queues}=queue({counting:[{word:'cat'}],blending:[{word:'dog'}]});
  expect(take(null,'blending')).toEqual({word:'dog'});expect(queues.counting).toHaveLength(1);expect(queues.blending).toEqual([]);
 });
 it('skips a repeated practice word and removes only the item served',()=>{
  const {take,queues}=queue({counting:[{singleWord:' CAT '},{word:'dog'},{word:'fish'}]});
  expect(take('cat')).toEqual({word:'dog'});expect(queues.counting).toEqual([{singleWord:' CAT '},{word:'fish'}]);
 });
 it('preserves fixed-form order including repeated words',()=>{
  const {take,queues}=queue({counting:[{word:'cat'},{word:'cat'},{word:'dog'}]},true);
  expect(take('cat')).toEqual({word:'cat'});expect(queues.counting).toEqual([{word:'cat'},{word:'dog'}]);
 });
 it('drains single-word queues and returns null when empty',()=>{
  const {take}=queue({counting:[{word:'cat'}]});expect(take('cat')).toEqual({word:'cat'});expect(take('cat')).toBeNull();
 });
 it('passes the destination explicitly when starting and recovering a queue',()=>{
  expect(source).toContain('const effectiveDiff = getEffectiveDifficulty(activityId);');
  expect(source).toContain('const retryWord = getAdaptiveRandomWord(null, activityId);');
 });
});
describe('phoneme progress with prepared pronunciation objects',()=>{
 function mastery(){let stats={};const update=callback('updatePhonemeMastery','trackConfusion',{WS_CORE:core,setPhonemeMastery:fn=>{stats=fn(stats);}});return {update,get:()=>stats};}
 it('records each distinct sound label without object-string keys',()=>{
  const m=mastery();m.update([{grapheme:' CH ',ipa:'tʃ'},{ipa:'ɪ'},'p','P',{},null,{grapheme:{},ipa:'s'}],true);
  expect(Object.keys(m.get())).toEqual(['ch','ɪ','p','s']);for(const stat of Object.values(m.get()))expect(stat).toMatchObject({total:1,independentCorrect:1,accuracy:100});
 });
 it('separates printed support, AAC, retries and independent responses',()=>{
  const m=mastery();m.update(['k'],true,{textSupported:true});m.update(['k'],true,{aacAssisted:true});m.update(['k'],true,{presentations:2});m.update(['k'],true);
  expect(m.get().k).toMatchObject({total:4,correct:4,textSupportedAttempts:1,textSupportedCorrect:1,aacAssistedAttempts:1,independentAttempts:2,independentCorrect:1,independentAccuracy:50,retryCorrect:1});
 });
 it('does not credit an exposed answer as independent phoneme mastery',()=>{
  const m=mastery();m.update(['k'],true,{answerExposed:true});expect(m.get().k).toMatchObject({firstTryCorrect:0,independentAttempts:0,independentCorrect:0,retryCorrect:0});
 });
});
describe('support evidence at answer time',()=>{
 it('records printed word and label clues as visual support',()=>{
  expect(core.responseEvidence({showWordText:true})).toMatchObject({mode:'visual',textSupported:true,cluesShown:['printed_word']});
  expect(core.responseEvidence({showLetterHints:true})).toMatchObject({mode:'visual',textSupported:true,cluesShown:['printed_sound_labels']});
  expect(core.responseEvidence({alwaysShowText:true})).toMatchObject({mode:'visual',textSupported:true});
  expect(core.responseEvidence()).toMatchObject({mode:'sound_only',textSupported:false,cluesShown:[]});
 });
 it('preserves connected-text evidence',()=>{
  const task=core.textEvidence({activity:'read_sentence',imageAvailable:false});expect(core.responseEvidence({taskEvidence:task})).toMatchObject({...task,mode:'visual',textSupported:true});
 });
 it('keeps exposed answers out of adaptive advancement even without taskKind',()=>{
  expect(core.difficultyDecision(successes('counting','visual').map(r=>({...r,answerExposed:true})),'counting',{mode:'visual'}).difficulty).toBe('easy');
 });
 it('keeps supported success without adding an independent activity streak',()=>{
  const build=callback('buildNextMasteryStat','shouldAdvanceActivity');
  const stat=build({independentConsecutiveStreak:3},true,{textSupported:true,word:'cat'});
  expect(stat).toMatchObject({correct:1,firstTryCorrect:1,textSupportedAttempts:1,independentCorrect:0,independentConsecutiveStreak:0});
 });
});
