import {describe,it,expect} from 'vitest';
import {internals,renderTab,baseData} from './helpers/dino_lab_harness.js';
const {dinoBodyPartDefinitions:parts,dinoAnatomyQuizDeck:deck,dinoAnatomyQuizAnswer:answer,dinoAnatomyQuizAdvance:advance}=internals();
const initial=(quadruped=false,seed=27)=>({speciesId:'test',open:true,deck:deck(quadruped,seed),index:0,answers:[],hint:false,finished:false});
describe('Anatomy learning content',()=>{
 it('gives every landmark a function, observation cue, evidence context, clue and source',()=>{
  for(const quad of [false,true]){const definitions=parts(quad);expect(definitions).toHaveLength(10);expect(new Set(definitions.map(p=>p.clue)).size).toBe(10);
   for(const p of definitions){for(const field of ['detail','purpose','look','evidence','clue','hint'])expect(p[field].length).toBeGreaterThan(25);expect(['bones','legs','feathers','skin']).toContain(p.source);}
  }
 });
 it('adapts forelimb explanations to quadrupedal support without overwriting other guides',()=>{
  expect(parts(true).find(p=>p.id==='hand').purpose).toContain('front foot');expect(parts(true).find(p=>p.id==='forelimb').purpose).toContain('carries weight');
  expect(parts(false).find(p=>p.id==='hand').purpose).toContain('hand forms');expect(parts(false).find(p=>p.id==='forelimb').purpose).toContain('wing');
 });
 it('keeps bone evidence separate from soft-tissue and behavioral inference',()=>{
  const list=parts(false);expect(list.find(p=>p.id==='head').evidence).toContain('reconstruction');expect(list.find(p=>p.id==='knee').evidence).toContain('ankle');expect(list.find(p=>p.id==='forelimb').evidence).toContain('alone do not establish powered flight');
 });
 it('makes the game discoverable without enabling anatomy labels',()=>{const html=renderTab(baseData('field3d'));expect(html).toContain('Anatomy Quest');expect(html).toContain('aria-expanded="false"');expect(html).not.toContain('Start anatomy quiz');});
});
describe('Five-clue quest generation',()=>{
 it('is reproducible and covers all ten landmarks across seeds',()=>{
  const seen=new Set();for(let seed=1;seed<=40;seed++){const a=deck(false,seed);expect(a).toEqual(deck(false,seed));expect(a).toHaveLength(5);expect(new Set(a.map(q=>q.partId)).size).toBe(5);
   for(const q of a){seen.add(q.partId);expect(q.choices).toHaveLength(3);expect(new Set(q.choices).size).toBe(3);expect(q.choices.filter(id=>id===q.partId)).toHaveLength(1);for(const id of q.choices)expect(parts(false).some(p=>p.id===id)).toBe(true);}
  }expect(seen.size).toBe(10);expect(deck(false,1)).not.toEqual(deck(false,2));
 });
 it('does not mutate the anatomy library during shuffle or label adaptation',()=>{const before=parts(false);deck(false,4);deck(true,9);expect(parts(false)).toEqual(before);});
});
describe('Quest answer and progression rules',()=>{
 it('prevents advancing before an answer and rejects unknown choices',()=>{const s=initial();expect(advance(s)).toBe(s);expect(answer(s,'made-up')).toBe(s);});
 it('records one first attempt despite repeated clicks',()=>{const s=initial(),correct=s.deck[0].partId,next=answer(s,correct);expect(next.answers).toEqual([{partId:correct,choice:correct,correct:true,hintUsed:false}]);expect(answer(next,s.deck[0].choices[1])).toBe(next);expect(s.answers).toEqual([]);});
 it('records wrong answers and hints for later review',()=>{const s={...initial(),hint:true},q=s.deck[0],wrong=q.choices.find(id=>id!==q.partId),next=answer(s,wrong);expect(next.answers[0]).toMatchObject({partId:q.partId,choice:wrong,correct:false,hintUsed:true});const moved=advance(next);expect(moved.index).toBe(1);expect(moved.hint).toBe(false);expect(advance(moved)).toBe(moved);});
 it('finishes exactly five clues and freezes completed results',()=>{let s=initial();for(let i=0;i<5;i++){const q=s.deck[s.index];s=advance(answer(s,i===2?q.choices.find(id=>id!==q.partId):q.partId));}expect(s.finished).toBe(true);expect(s.answers).toHaveLength(5);expect(s.answers.filter(a=>a.correct)).toHaveLength(4);expect(advance(s)).toBe(s);expect(answer(s,s.deck[4].partId)).toBe(s);});
});
