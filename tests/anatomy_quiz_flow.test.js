import fs from 'node:fs';
import {beforeEach,describe,expect,it} from 'vitest';
import {loadTool,makeCtx,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const paths=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(n,p){if(!n||typeof n!=='object')return null;if(Array.isArray(n)){for(const c of n){const hit=find(c,p);if(hit)return hit;}return null;}return p(n)?n:find(n.props?.children,p);}
function text(n){return n==null||typeof n==='boolean'?'':typeof n!=='object'?String(n):Array.isArray(n)?n.map(text).join(' '):text(n.props?.children);}
function session(file,extra={}){const tool=loadTool(file,'anatomy');let data={anatomy:{system:'skeletal',view:'anterior',complexity:1,_activeTab:'quiz',_structureNotes:{skull:'Saved note'},...extra}};
 const render=()=>tool.render(makeCtx({toolData:data,setToolData:u=>{data=typeof u==='function'?u(data):u;}}));
 const node=p=>{const hit=find(render(),p);expect(hit).not.toBeNull();return hit;};
 return {data:()=>data.anatomy,patch:p=>data={anatomy:{...data.anatomy,...p}},node,answer:id=>node(n=>n.props?.['data-anatomy-quiz-option']===id).props.onClick(),click:label=>node(n=>n.type==='button'&&(n.props['aria-label']===label||text(n).trim()===label)).props.onClick(),html:()=>{const root=document.createElement('div');root.innerHTML=renderTool('anatomy',data);return root;}};
}
beforeEach(resetStemLab);
for(const file of paths)describe('Quiz study flow: '+file,()=>{
 it('labels a missed answer explicitly and preserves the question, score, and notes through Explore',()=>{
  const s=session(file);expect(s.html().querySelectorAll('[data-result=correct]')).toHaveLength(0);
  s.answer('humerus');const saved=JSON.parse(JSON.stringify(s.data()));
  expect(s.html().querySelector('[data-anatomy-quiz-option=humerus]').textContent).toContain('Your answer');
  expect(s.html().querySelector('[data-anatomy-quiz-option=skull]').textContent).toContain('Correct answer');
  s.node(n=>n.props?.['data-anatomy-quiz-study']==='skull').props.onClick();
  expect(s.data()._activeTab).toBe('explore');expect(s.html().querySelector('[data-anatomy-quiz-return]')).not.toBeNull();
  s.click('Return to Question 1');expect(s.data()._activeTab).toBe('quiz');
  expect(s.data()._quizQuestion).toEqual(saved._quizQuestion);expect(s.data().quizFeedback).toEqual(saved.quizFeedback);
  expect(s.data()._quizAttempts).toBe(1);expect(s.data()._structureNotes.skull).toBe('Saved note');
  expect(s.html().querySelectorAll('[data-anatomy-quiz-option]:disabled')).toHaveLength(4);
 });
 it('offers diagram study after a missed system question and hides stale return links',()=>{
  const s=session(file,{quizIdx:2});const options=[...s.html().querySelectorAll('[data-anatomy-quiz-option]')].map(el=>el.dataset.anatomyQuizOption);
  s.answer(options.find(id=>id!=='skeletal'));s.node(n=>n.props?.['data-anatomy-quiz-study']).props.onClick();
  expect(s.html().querySelector('[data-anatomy-quiz-return]')).not.toBeNull();
  s.patch({view:'posterior'});expect(s.html().querySelector('[data-anatomy-quiz-return]')).toBeNull();
 });
 it('does not restore a return link for a restarted question at the same index',()=>{
  const s=session(file);s.answer('humerus');s.node(n=>n.props?.['data-anatomy-quiz-study']).props.onClick();s.click('Return to Question 1');
  const before=s.data()._quizQuestion.token;s.click('Restart quiz');expect(s.data()._quizQuestion.token).not.toBe(before);
  expect(s.data().quizScore).toBe(0);expect(s.data()._quizAttempts).toBe(0);expect(s.data()._structureNotes.skull).toBe('Saved note');
  s.click('End quiz and return to Explore');expect(s.html().querySelector('[data-anatomy-quiz-return]')).toBeNull();
 });
 it('matches keyboard instructions to the actual answer count',()=>{
  const s=session(file,{quizIdx:1});expect(s.html().querySelectorAll('[data-anatomy-quiz-option]')).toHaveLength(2);
  expect(s.html().querySelector('.anatomy-quiz-answer-help').textContent).toContain('1–2');
 });
 it('binds legacy saved feedback to the displayed question before opening diagram study',()=>{
  const s=session(file,{quizFeedback:{chosen:'humerus',correct:false}});s.node(n=>n.props?.['data-anatomy-quiz-study']==='skull').props.onClick();
  expect(s.html().querySelector('[data-anatomy-quiz-return]')).not.toBeNull();expect(s.data().quizFeedback.questionKey).toBe(s.data()._quizStudyReturn.questionKey);
  s.click('Return to Question 1');expect(s.html().querySelector('[data-anatomy-quiz-feedback]').textContent).toContain('The answer was: Skull');
 });
});
describe('Quiz flow translation parity',()=>{for(const lang of ['french','spanish_latin_america','arabic'])it(lang+' covers new labels and placeholders',()=>{
 const source=fs.readFileSync(paths[0],'utf8'),strings=[...source.matchAll(/t\('stem\.anatomy\.(quiz_flow_[^']+)', '([^']*)'\)/g)],data=JSON.parse(fs.readFileSync('lang/'+lang+'.js','utf8')).stem.anatomy;
 expect(strings).toHaveLength(16);for(const [,key,fallback]of strings){expect(data[key],key).toBeTruthy();expect((data[key].match(/\{\w+\}/g)||[]).sort()).toEqual((fallback.match(/\{\w+\}/g)||[]).sort());}
 expect(fs.readFileSync('lang/'+lang+'.js','utf8')).toBe(fs.readFileSync('desktop/web-app/public/lang/'+lang+'.js','utf8'));
});});
