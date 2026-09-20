import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const service = createRequire(import.meta.url)('../agent_core_resource_pack_module.js');
const compose = (item) => service.compose({requestId:'format-review',sourceTopic:'Weather',learningGoal:'Explain weather using evidence',privacy:{confirmNoStudentPii:true,confirmSourcePermission:true},history:[{id:'resource-1',title:'Weather',meta:'',...item}]});
const validQuiz = () => ({questions:Array.from({length:3},()=>({type:'mcq',question:'Which is rain?',options:['Drops','Snow','Wind','Sun'],correctAnswer:'Drops'})),reflections:[{text:'What evidence helped?'}]});
describe('MCP pack formatting boundary',()=>{
 it('returns errors instead of throwing for a non-array history',()=>{expect(service.validatePack({allopack:{spec:'0.1'},sourceTopic:'Weather',history:{}}).ok).toBe(false);});
 it('returns errors instead of throwing for null quiz questions',()=>{const data=validQuiz();data.questions[1]=null;expect(compose({type:'quiz',data}).errors.some(e=>e.code==='invalid-quiz-question')).toBe(true);});
 it('does not silently stringify object metadata',()=>{const r=compose({type:'simplified',data:'This paragraph explains how falling drops of liquid water reach the ground.',meta:{label:'Reading'}});expect(r.errors.some(e=>e.code==='invalid-meta')).toBe(true);});
 it('checks an omitted question type as the MCQ the renderer will display',()=>{const data=validQuiz();delete data.questions[0].type;delete data.questions[0].correctAnswer;expect(compose({type:'quiz',data}).ok).toBe(false);});
 it('rejects object choices and duplicate choices',()=>{const data=validQuiz();data.questions[0].options[1]={text:'Snow'};data.questions[1].options[1]='Drops';const r=compose({type:'quiz',data});expect(r.errors.some(e=>e.code==='invalid-display-text')).toBe(true);expect(r.errors.some(e=>e.code==='duplicate-quiz-option')).toBe(true);});
 it.each([
 ['anchor-chart',{title:'Clouds',sections:[{label:'Rain',bullets:['Drops']},{label:'Snow',bullets:[{text:'Flakes'}]}]}],
 ['outline',{main:'Clouds',branches:[{title:'Rain',items:['Drops']},{title:'Snow',items:{text:'Flakes'}}]}],
 ['timeline',{progressionLabel:'Before to after',items:[{date:'First',event:'Clouds form'},{date:'Next',event:'Rain falls'},{date:'Last',event:{text:'Runoff'}}]}],
 ['sentence-frames',{mode:'list',items:['I noticed ...'],rubric:'Use evidence'}],
 ['math',{problems:Array.from({length:3},()=>({question:'How many?',answer:'3',steps:['Count each drop']}))}],
 ])('rejects malformed nested %s display fields',(type,data)=>{expect(compose({type,data}).ok).toBe(false);});
 it('rejects duplicate category IDs and nameless sort cards',()=>{const data={categories:[{id:'a',label:'Rain'},{id:'a',label:'Snow'}],items:Array.from({length:4},(_,i)=>({id:'card'+i,categoryId:'a'}))};const r=compose({type:'concept-sort',data});expect(r.errors.some(e=>e.code==='duplicate-or-missing-id')).toBe(true);expect(r.errors.some(e=>e.path.endsWith('.content'))).toBe(true);});
 it('keeps markdown paragraph and table formatting byte-for-byte',()=>{const data='A clear opening paragraph about the weather.\n\n| Observation | Evidence |\n| --- | --- |\n| Rain | Liquid drops |';const r=compose({type:'simplified',data});expect(r.ok).toBe(true);expect(r.value.history[0].data).toBe(data);});
 it('accepts valid nested structures and numeric zero answers',()=>{expect(compose({type:'quiz',data:validQuiz()}).ok).toBe(true);expect(compose({type:'math',data:{problems:Array.from({length:3},()=>({question:'One minus one?',answer:0,steps:[{explanation:'Remove the one item.'}]}))}}).ok).toBe(true);});
});

it('accepts native reflection aliases and validates both short-answer spellings',()=>{
 const data=validQuiz();data.reflections=['Explain your evidence.',{prompt:'What helped?'},{text:'What next?'}];
 expect(compose({type:'quiz',data}).ok).toBe(true);
 data.questions[0]={type:'short-answer',question:'Explain your evidence.'};
 expect(compose({type:'quiz',data}).errors.some(e=>e.code==='invalid-quiz-answer')).toBe(true);
});

it.each(['id','type'])('reports a malformed object %s without coercion or crashes',(field)=>{
 const r=compose({type:'quiz',data:validQuiz()});expect(r.ok).toBe(true);
 r.value.history[0][field]={toString:null};
 expect(service.validatePack(r.value).ok).toBe(false);
});

const composeHistory=history=>service.compose({requestId:'reference-review',sourceTopic:'Weather',learningGoal:'Explain weather using evidence',privacy:{confirmNoStudentPii:true,confirmSourcePermission:true},history});
const directions=objectives=>({id:'directions',type:'directions',title:'Directions',meta:'',data:{body:'Read and explain the weather.',objectives}});
const reading={id:'reading',type:'simplified',title:'Reading',meta:'',data:'Weather observations include liquid drops falling from clouds to the ground.'};
describe('activity references and selectable answers',()=>{
 it('accepts forward links and optional unlinked manual goals',()=>{
  expect(composeHistory([directions([{id:'a',label:'Explain a pattern',kind:'manual',resourceRef:'reading'},{id:'b',label:'Reflect',kind:'manual'}]),reading]).ok).toBe(true);
 });
 it.each(['missing','',null,{id:'reading'}])('rejects invalid goal reference %j',resourceRef=>{
  const r=composeHistory([directions([{id:'a',label:'Explain',kind:'manual',resourceRef}]),reading]);
  expect(r.ok).toBe(false);expect(r.errors.some(e=>e.path==='pack.history[0].data.objectives[0].resourceRef')).toBe(true);
 });
 it('rejects duplicate goal IDs and missing labels',()=>{
  const r=composeHistory([directions([{id:'a',label:'Explain',kind:'manual'},{id:'a',kind:'manual'}])]);expect(r.errors.map(e=>e.code)).toEqual(expect.arrayContaining(['duplicate-or-missing-id','invalid-display-text']));
 });
 it.each([null,'reading',{}, {resourceId:'absent'}])('reports malformed or dangling lessonRef %j',lessonRef=>{
  const r=composeHistory([{...reading,data:{body:'Read the weather.',lessonRef},type:'directions'}]);expect(r.ok).toBe(false);expect(r.errors.some(e=>e.path.includes('.lessonRef'))).toBe(true);
 });
 it('accepts a lessonRef to a later resource',()=>{
  const r=composeHistory([{...directions([]),data:{body:'Read the weather.',lessonRef:{resourceId:'reading'}}},reading]);expect(r.ok).toBe(true);
 });
 const sequence=extra=>({type:'sequence-sense',question:'How are the stages ordered?',items:['First stage','Second stage'],presentedOrder:[0,1],intentionallyWrongIndex:null,orderingPrinciple:'process',...extra});
 const withQuestion=q=>{const d=validQuiz();d.questions[1]=q;return compose({type:'quiz',data:d});};
 it('accepts native default principles and a null misplaced-item marker',()=>{expect(withQuestion(sequence()).ok).toBe(true);});
 it.each([[],['process'],['size','hierarchy'],['process',' PROCESS ']].map(principleOptions=>({principleOptions})))('rejects unanswerable or ambiguous sequence choices $principleOptions',({principleOptions})=>{expect(withQuestion(sequence({principleOptions})).ok).toBe(false);});
 it('requires a custom principle to be among explicit choices',()=>{
  expect(withQuestion(sequence({orderingPrinciple:'least to greatest'})).ok).toBe(false);
  expect(withQuestion(sequence({orderingPrinciple:'least to greatest',principleOptions:['least to greatest','greatest to least']})).ok).toBe(true);
 });
 it.each([
  {type:'multi-select',options:['Rain',' RAIN '],correctAnswers:['Rain']},
  {type:'answer-evidence',answerOptions:['Rain',' RAIN '],correctAnswer:'Rain',evidenceOptions:['Drops','Flakes'],correctEvidence:'Drops'},
  {type:'relation-mismatch',pairs:[{left:'a',right:'b'},{left:'c',right:'d'}],wrongPairIndex:0,candidatePartners:['Rain',' RAIN '],correctPartnerForWrong:'Rain'}
 ])('rejects duplicate visible labels in $type',q=>{expect(withQuestion({question:'Choose the supported response.',...q}).errors.some(e=>e.code==='invalid-choice-set')).toBe(true);});
});

it('blocks provider-generated dangling links before returning a usable pack',async()=>{
 const r=await service.generate({requestId:'provider-links',sourceTopic:'Weather',sourceText:'Weather changes.',learningGoal:'Explain observations',resourcePlan:['directions'],privacy:{confirmNoStudentPii:true,confirmSourcePermission:true},providerPolicy:{provider:'stub'}},{name:'stub',generateText:async()=>({history:[reading,directions([{id:'goal',kind:'manual',label:'Explain',resourceRef:'missing-resource'}])]})});
 expect(r.ok).toBe(false);expect(r.errors.some(e=>e.code==='unresolved-resource-reference')).toBe(true);expect(r.value).toBeNull();
});
