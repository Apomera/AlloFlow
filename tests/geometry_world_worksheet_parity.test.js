import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
const originalLab=window.StemLab;
let api;
beforeAll(()=>{
  window.StemLab={registerTool:vi.fn()};
  new Function(source)();
  api=window.StemLab.geometryWorldWorksheets;
});
afterAll(()=>{window.StemLab=originalLab;});
function doc(lesson,options){return new DOMParser().parseFromString(api.html(lesson,options),'text/html');}
function walk(question){return question?[question,...(question.followUp||[]).flatMap(walk)]:[];}
const generated=()=>({title:'Generated Garden of Bridges',description:'Investigate layers and design a crossing.',objectives:['Relate layers to volume','Compare two strategies'],npcs:[
 {name:'Arrival',position:[0,1,0],dialogue:'Follow the blue path to the bridge.',question:null},
 {name:'Second mentor',position:[9,1,0],dialogue:'SOLUTION_SENTINEL_96: use 8 × 4 × 3.',question:{text:'How does your revision compare?',choices:['Same','More','Less'],correct:1,explanation:'SOLUTION_EXPLANATION',followUp:[]}},
 {name:'First mentor',position:[3,1,0],dialogue:'SOLUTION_SENTINEL_24: two layers of twelve.',question:{text:'How many cubes in this bridge?',choices:['12','24','36'],correct:1,measurement:{structureId:'bridge',quantity:'volume',expected:24},followUp:[{text:'How many cubes in one layer?',choices:['12','6','4'],correct:0,followUp:[{text:'Why do two layers double the volume?',choices:['Each layer adds the same number','Height does not matter','Only the outline counts'],correct:0}]}]}}
],structures:[{id:'bridge',type:'fill',x1:2,x2:5,y1:1,y2:2,z1:2,z2:4,block:'wood'}],activities:[
 {id:'first',title:'Build and measure',npcName:'First mentor',structureIds:['bridge'],challenge:'Build a different bridge with the same volume.',successCriteria:'Use full cubes and explain the comparison.',hint:'SOLUTION_HINT',reflection:'Explain how one layer relates to your calculation.'},
 {id:'second',title:'Revise your bridge',npcName:'Second mentor',structureIds:[],challenge:'Reuse your earlier model and change one dimension.',successCriteria:'Check and record the new dimensions.',reflection:'Which calculation strategy helped you check your revision?'}
]});

describe('Geometry World lesson worksheet parity',()=>{
 it('exports every preset question and follow-up exactly once with unchanged choices',()=>{
  const presets=api.presets();expect(Object.keys(presets)).toHaveLength(12);
  for(const [key,lesson] of Object.entries(presets)){
   const original=JSON.stringify(lesson), expected=(lesson.npcs||[]).flatMap(n=>walk(n.question));
   const page=doc(lesson),questions=[...page.querySelectorAll('.question')];
   expect(questions.length,key).toBe(expected.length);
   for(const q of expected){const rendered=questions.find(n=>n.querySelector('.question-text').textContent===q.text);expect(rendered,key+': '+q.text).toBeTruthy();expect([...rendered.querySelectorAll('.choices li')].map(n=>n.textContent)).toEqual(q.choices.map(String));}
   expect(page.querySelectorAll('.answer')).toHaveLength(0);
   for(const a of lesson.activities||[]){expect(page.body.textContent).toContain(a.challenge);expect(page.body.textContent).toContain(a.reflection);const keyDoc=doc(lesson,{mode:'teacher'});for(const criterion of Array.isArray(a.successCriteria)?a.successCriteria:[a.successCriteria])if(criterion)expect(keyDoc.body.textContent).toContain(criterion);}
   expect(JSON.stringify(lesson)).toBe(original);
  }
 });
 it('uses activity route order for generated/imported lessons and recursively includes nested reasoning steps',()=>{
  const lesson=generated(),model=api.model(lesson),page=doc(lesson);
  expect(model.sections.map(s=>s.title)).toEqual(['Arrival','Build and measure','Revise your bridge']);
  const expected=[...walk(lesson.npcs[2].question),...walk(lesson.npcs[1].question)];
  expect([...page.querySelectorAll('.question-text')].map(n=>n.textContent)).toEqual(expected.map(q=>q.text));
  expect([...page.querySelectorAll('.question')].map(n=>Number(n.dataset.questionNumber))).toEqual([1,2,3,4]);
  expect(page.body.textContent).toContain('world coordinates (3, 1, 0)');expect(page.body.textContent).toContain('Teaching models: bridge');
  expect(page.body.textContent).not.toContain('The Hidden Garden');expect(model.questionCount).toBe(4);
 });
 it('keeps authored answers, worked mentor teaching, and hints in a separate key',()=>{
  const lesson=generated(),student=doc(lesson),teacher=doc(lesson,{mode:'teacher'});
  for(const secret of ['SOLUTION_SENTINEL_24','SOLUTION_SENTINEL_96','SOLUTION_EXPLANATION','SOLUTION_HINT']){expect(student.body.textContent).not.toContain(secret);expect(teacher.body.textContent).toContain(secret);}
  expect(teacher.querySelectorAll('.answer')).toHaveLength(4);
  expect(teacher.querySelector('.answer').textContent).toContain('B. 24');
  expect(student.querySelectorAll('.question .work-space')).toHaveLength(12);
  expect(student.body.textContent).not.toContain('Volume = ___');
  expect(student.body.textContent).not.toContain('Every block in Geometry World is 1 unit cube');
 });
 it('preserves actual exploration tasks without inventing garden stations or answers',()=>{
  const lesson={title:'My Garden of Symmetry',npcs:[{name:'Mirror guide',dialogue:'Build a reflection across the path and explain what stays the same.',question:null}]},page=doc(lesson);
  expect(page.querySelector('[data-guide-task]').textContent).toBe(lesson.npcs[0].dialogue);
  expect(page.body.textContent).not.toContain('The Single Cube');expect(page.body.textContent).not.toContain('three gold structures');
  expect(doc({title:'Open build'}).querySelector('[data-lesson-task]')).toBeTruthy();
 });
 it('safely renders imported text and does not mutate or reorder authored choices',()=>{
  const lesson=generated();lesson.title='<img src=x onerror=alert(1)>';lesson.activities[0].challenge='<script>alert(1)</script>';
  lesson.npcs[2].question.choices[1]='<svg onload=alert(1)>';
  const before=JSON.stringify(lesson),page=doc(lesson);
  expect(page.querySelectorAll('script,img,svg')).toHaveLength(0);expect(page.querySelector('h1').textContent).toBe(lesson.title);
  expect(page.body.textContent).toContain('<script>alert(1)</script>');expect(JSON.stringify(lesson)).toBe(before);
 });
 it('only includes bounded safe snapshot evidence in the explicit learning record',()=>{
  const image='data:image/png;base64,aGVsbG8=',snapshots=[{image,caption:'I can see two layers.',reasoning:'12 + 12 = 24',activityTitle:'Build and measure',capturedAt:123456789}];
  expect(doc(generated(),{snapshots}).querySelector('.moment')).toBeNull();expect(doc(generated(),{mode:'teacher',snapshots}).querySelector('.moment')).toBeNull();
  const record=doc(generated(),{mode:'record',snapshots});expect(record.querySelector('.moment').getAttribute('src')).toBe(image);expect(record.body.textContent).toContain('12 + 12 = 24');
  const bad=[{image:'https://tracker.invalid/a.png'},{image:'data:image/svg+xml;base64,aGVsbG8='},{image:'data:image/png;base64,'+'a'.repeat(240001)}];
  expect(doc(generated(),{mode:'record',snapshots:bad}).querySelector('.moment')).toBeNull();
  expect(doc(generated(),{mode:'record',snapshots:Array(8).fill(snapshots[0])}).querySelectorAll('.moment')).toHaveLength(6);
 });
 it('walks safely through malformed and cyclic imported question trees',()=>{
  const q={text:'A valid question?',choices:['Yes','No'],correct:0};q.followUp=[{text:'invalid choices'},q];
  expect(api.questions(q)).toEqual([q]);expect(api.model({npcs:[{name:'Guide',question:q}]}).questionCount).toBe(1);
 });
 it('normalizes nested imported questions before live play and printing',()=>{
  const q={text:'Base',choices:['a','b'],correct:'1',followUp:[{text:'Nested',choices:['x','y','z'],correct:99,followUp:[{text:'Deep',choices:['yes','no'],correct:'1'}]},{text:5,choices:['bad','data']}]};
  const result=api.normalizeQuestion(q),sequence=api.questions(result);
  expect(sequence.map(n=>n.correct)).toEqual([1,2,1]);expect(sequence.every(n=>n.choices.length===3)).toBe(true);
  expect(api.model({npcs:[{name:'Guide',question:result}]}).sections[0].questions.map(n=>n.correct)).toEqual([1,2,1]);
  expect(q.correct).toBe('1');expect(api.normalizeQuestion({text:true,choices:['x','y']})).toBeNull();
 });
 it('keeps the packaged Geometry World implementation identical',()=>{expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_geometryworld.js','utf8')).toBe(source);});
});
