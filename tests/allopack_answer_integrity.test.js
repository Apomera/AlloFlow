// Structural integrity for every quiz and math activity, in both editions.
// Factual accuracy and the adequacy of an answer guide still require content review.
import {describe,it,expect} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const {validateAnswers}=createRequire(import.meta.url)('../dev-tools/lib/allopack_answer_integrity.cjs');
const dir=resolve(process.cwd(),'allopacks');
const files=readdirSync(dir).filter(f=>f.endsWith('.allopack.json'));
files.push(...readdirSync(resolve(dir,'illustrated')).filter(f=>f.endsWith('.allopack.json')).map(f=>'illustrated/'+f));
describe.each(files)('answer integrity: %s',file=>{
 it('checks every quiz and math resource for usable answer keys',()=>{
  const p=JSON.parse(readFileSync(resolve(dir,file),'utf8').replace(/^\uFEFF/,''));
  expect(validateAnswers(p)).toEqual([]);
 });
});
const quiz=questions=>({type:'quiz',data:{questions}});
const mcq=()=>({type:'mcq',question:'Which?',options:['First','Second'],correctAnswer:'First'});
const math=answer=>({type:'math',data:{problems:[{answer,steps:[{explanation:'Subtract the equal quantities.'}]}]}});
describe('answer audit coverage regressions',()=>{
 it('finds a broken key in a later quiz',()=>{const second=mcq();second.correctAnswer='Missing';expect(validateAnswers({history:[quiz([mcq()]),quiz([second])]})).toContainEqual({path:'history[1].data.questions[0].correctAnswer',message:'Answer must exactly match one offered choice.'});});
 it.each(['shortAnswer','short-answer'])('checks %s in every quiz without an arbitrary length rule',type=>{
  expect(validateAnswers({history:[quiz([mcq()]),quiz([{type,expectedAnswer:'   '}])]})).toHaveLength(1);
  expect(validateAnswers({history:[quiz([{type,expectedAnswer:'Zero.'}])]})).toEqual([]);
 });
 it('accepts numeric zero and finds missing answers in later math resources',()=>{expect(validateAnswers({history:[math(0)]})).toEqual([]);expect(validateAnswers({history:[math(0),math(null)]})).toHaveLength(1);});
 it('catches visually repeated choices and omitted-type MCQs',()=>{const q=mcq();delete q.type;q.options=['First',' FIRST '];expect(validateAnswers({history:[quiz([q])]}).map(e=>e.path)).toContain('history[0].data.questions[0].options');});
 it('reports malformed structures without throwing',()=>{expect(validateAnswers({history:[quiz([null]),{type:'math',data:{problems:[null]}}]})).toHaveLength(2);});
});
