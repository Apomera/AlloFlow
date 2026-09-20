import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
const service=createRequire(import.meta.url)('../agent_core_resource_pack_module.js');
const privacy={confirmNoStudentPii:true,confirmSourcePermission:true};
const base={type:'mcq',question:'Choose a kind of weather.',options:['Rain','Snow','Wind','Sun'],correctAnswer:'Rain'};
const compose=(type,data)=>service.compose({requestId:'native-shapes',sourceTopic:'Weather',learningGoal:'Explain changes',privacy,history:[{id:'r',type,title:'Review',meta:'',data}]});
const quiz=q=>compose('quiz',{questions:[q,structuredClone(base),structuredClone(base)]});
const cases=[
 {q:{type:'multi-select',question:'Choose two.',options:['Rain','Snow','Sun'],correctAnswers:['Rain','Snow']},field:'correctAnswers',bad:['Missing']},
 {q:{type:'fill-blank',question:'Complete this.',expectedFill:'rain',acceptableAlternatives:[]},field:'expectedFill',bad:{text:'rain'}},
 {q:{type:'self-explanation',question:'Explain this.',rubric:'Use the source.'},field:'rubric',bad:{text:'Use evidence'}},
 {q:{type:'sequence-sense',question:'Check this order.',items:['First','Next','Last'],presentedOrder:[1,0,2],orderingPrinciple:'chronological'},field:'presentedOrder',bad:[0,0,2]},
 {q:{type:'relation-mismatch',question:'Find the mismatch.',pairs:[{left:'Rain',right:'Liquid'},{left:'Snow',right:'Gas'}],wrongPairIndex:1,candidatePartners:['Solid','Gas'],correctPartnerForWrong:'Solid'},field:'wrongPairIndex',bad:5},
 {q:{type:'answer-evidence',question:'Choose support.',answerOptions:['Yes','No'],correctAnswer:'Yes',evidenceOptions:['Observation','Guess'],correctEvidence:'Observation'},field:'correctEvidence',bad:'Missing'},
 {q:{type:'numeric-response',question:'How many?',correctValue:0,tolerance:0,unit:'drops',acceptableUnits:[]},field:'tolerance',bad:-1},
];
describe('native quiz renderer fields',()=>{
 it.each(cases)('accepts valid $q.type and rejects malformed $field',({q,field,bad})=>{expect(quiz(q).ok).toBe(true);expect(quiz({...q,[field]:bad}).ok).toBe(false);});
 it('accepts blank Cornell responses but rejects object text and repeated note IDs',()=>{const data={templateType:'cornell-notes',cues:[{id:'c1',text:'What changed?'},{id:'c2',text:'Why?'}],notes:[{id:'n1',text:''},{id:'n2',text:''}]};expect(compose('note-taking',data).ok).toBe(true);data.notes[1]={id:'n1',text:{text:'rain'}};expect(compose('note-taking',data).ok).toBe(false);});
 it('rejects an empty normalized plan before contacting a provider',async()=>{const provider={name:'stub',generateText:vi.fn()};const report=await service.generate({requestId:'empty-plan',sourceTopic:'Water',sourceText:'Water changes state.',learningGoal:'Explain it.',resourcePlan:['simplified'],instructionalContext:{adaptedTextPolicy:'omit'},privacy,providerPolicy:{provider:'stub'}},provider);expect(report.errors.some(e=>e.code==='empty-resource-plan')).toBe(true);expect(provider.generateText).not.toHaveBeenCalled();});
 it('reports malformed plan types without attempting object coercion',()=>{const report=service.validateRequest({requestId:'bad-type',sourceTopic:'Water',sourceText:'Water changes state.',learningGoal:'Explain it.',resourcePlan:[{type:{toString:null}}],privacy,providerPolicy:{provider:'stub'}});expect(report.errors.some(e=>e.code==='unsupported-resource-type')).toBe(true);});
});

