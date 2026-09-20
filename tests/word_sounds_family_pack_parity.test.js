import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { core, compileWords } from './helpers/word_sounds_core.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';
const source=readFileSync('word_sounds_module.js','utf8');
const start=source.indexOf('const resolveWordFamilyRime ='),end=source.indexOf('const includeOrthographic =',start);
const resolveFamily=new Function('WS_CORE','RIME_FAMILIES','SOUND_MATCH_POOL',source.slice(start,end)+';return resolveWordFamilyRime;')(core,{at:['cat','hat','bat','mat'],un:['sun','fun','run']},[]);
const board={rime:'at',options:['hat','bat'],distractors:['dog','sun']};
describe('Word Families prepared board integrity',()=>{
 it('accepts a complete board and returns copies in the prepared order',()=>{
  expect(core.validWordFamilyBoard(board,'cat')).toBe(true);
  const result=resolveFamily('cat',null,board);
  expect(result).toEqual({rime:'at',members:['hat','bat'],distractors:['dog','sun'],prepared:true});
  result.members.push('mat');expect(board.options).toEqual(['hat','bat']);
 });
 it.each([
  {options:[]},{distractors:[]},{options:['hat','hat']},{distractors:['hat']},
  {options:['cat']},{options:['dog']},{distractors:['mat']},{rime:'un'},
  {options:[{}]},{options:['']},{rime:''},{rime:'-at'},
 ])('rejects an empty, conflicting or malformed prepared board: %j',patch=>{
  expect(core.validWordFamilyBoard({...board,...patch},'cat')).toBe(false);
 });
 it('falls back for legacy and damaged prepared boards',()=>{
  expect(resolveFamily('cat',null)).toEqual({rime:'at',members:['hat','bat','mat']});
  expect(resolveFamily('cat',null,{...board,options:['dog']})).toEqual({rime:'at',members:['hat','bat','mat']});
 });
 it('honors newer teacher edits ahead of an old compiled board',()=>{
  const result=resolveFamily('cat',{teacherEdited:true,rime:'-at',words:['mat'],distractors:['dog']},board);
  expect(result.rime).toBe('at');expect(result.members).toEqual(['mat']);expect(result.prepared).not.toBe(true);
 });
 it('keeps an explicitly edited exception without allowing conflicting choices',()=>{
  const edited={teacherEdited:true,rime:'at',options:['said'],distractors:['dog']};
  expect(core.validWordFamilyBoard(edited,'cat')).toBe(true);
  expect(core.validWordFamilyBoard({...edited,distractors:['said']},'cat')).toBe(false);
 });
 it('compiles only matching members and normalizes the supplied family',()=>{
  const word=compileWords([{...makePackItem(),familyEnding:'-AT',familyMembers:['HAT','dog','hat','bat','cat','at']}])[0];
  expect(word.activityItems.word_families.rime).toBe('at');
  expect(new Set(word.activityItems.word_families.options)).toEqual(new Set(['hat','bat']));
  expect(core.validWordFamilyBoard(word.activityItems.word_families,'cat')).toBe(true);
 });
 it('preserves reviewed order and distractors when a teacher-edited pack is prepared again',()=>{
  const spec={teacherEdited:true,rime:'-at',words:['mat','bat','hat'],distractors:['sun','dog']};
  const word=compileWords([{...makePackItem(),rimeFamilyMembers:spec}])[0];
  expect(word.activityItems.word_families).toEqual({teacherEdited:true,rime:'at',options:spec.words,distractors:spec.distractors});
  expect(resolveFamily('cat',spec,word.activityItems.word_families)).toMatchObject({prepared:true,members:spec.words,distractors:spec.distractors});
 });
 it('does not publish a teacher board with contradictory scoring',()=>{
  const word=compileWords([{...makePackItem(),rimeFamilyMembers:{teacherEdited:true,rime:'at',words:['hat'],distractors:['hat']}}])[0];
  expect(word.activityItems.word_families).toBeUndefined();
 });
 it('shares the exact packed instruction across setup and both player replay paths',()=>{
  expect(core.wordFamilyInstruction('at')).toBe('Find all words in the at family');
  const setup=readFileSync('word_sounds_setup_source.jsx','utf8');
  expect(setup).toContain('tasks.add(WS_CORE.wordFamilyInstruction(boards.word_families.rime))');
  expect(source.match(/handleAudio\(WS_CORE.wordFamilyInstruction\(targetRime\)\)/g)).toHaveLength(2);
 });
});
