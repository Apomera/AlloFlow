import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const service=createRequire(import.meta.url)('../agent_core_resource_pack_module.js');
const host=fs.readFileSync('AlloFlowANTI.txt','utf8'),start=host.indexOf('function _alloNormalizeDirectionsData('),end=host.indexOf('let globalAudioCtx');
if(start<0||end<=start)throw Error('Native goal-helper anchors moved');
const {optionsFor,normalize,outlineGames,capabilities}=new Function(host.slice(start,end)+'\nreturn {optionsFor:_alloGoalOptionsForResource,normalize:_alloNormalizeDirectionsData,outlineGames:_ALLO_OUTLINE_GAMES,capabilities:_ALLO_GOAL_CAPABILITIES};')();
const repeat=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
const data={
 directions:{body:'Read the source and explain the main idea.'},
 simplified:'This reading explains how weather changes and how observations help us describe those changes.',
 glossary:repeat(4,i=>({term:'Term '+i,def:'A definition for the weather term.'})),
 outline:{main:'Weather',branches:repeat(2,i=>({title:'Pattern '+i,items:['Observe the changes.']}))},
 quiz:{questions:repeat(3,()=>({type:'mcq',question:'Which is liquid precipitation?',options:['Rain','Snow','Wind','Sunshine'],correctAnswer:'Rain'}))},
 'sentence-frames':{mode:'list',rubric:'Explain the evidence.',items:[{text:'The evidence shows ____.'}]},
 faq:repeat(2,i=>({question:'How does pattern '+i+' change?',answer:'Observe it over time.'})),
 'concept-sort':{categories:[{id:'a',label:'Rain'},{id:'b',label:'Snow'}],items:repeat(4,i=>({id:'c'+i,categoryId:i%2?'a':'b',content:'Example '+i}))},
 timeline:{progressionLabel:'First to last',items:repeat(3,i=>({date:'Stage '+i,event:'Observe the weather.'}))},
 math:{problems:repeat(3,()=>({question:'What is one minus one?',answer:0,steps:[{explanation:'Remove the one item.'}]}))},
 'note-taking':{templateType:'cornell-notes',cues:[{id:'c',text:'What changed?'}],notes:[{id:'n',text:''}]},
 'anchor-chart':{title:'Weather',sections:repeat(2,i=>({label:'Pattern '+i,bullets:['Look for evidence.']}))}
};
const target=(type,override)=>({id:'target',type,title:'Learning resource',meta:'',data:structuredClone(override||data[type])});
const goal=(kind,extra={})=>({id:'goal',label:'Describe my progress',kind,resourceRef:'target',...extra});
function compose(resource,objective){return service.compose({requestId:'goal-parity',sourceTopic:'Weather',learningGoal:'Explain weather using evidence',privacy:{confirmNoStudentPii:true,confirmSourcePermission:true},history:[{id:'directions',type:'directions',title:'Directions',meta:'',data:{body:'Use the learning resource.',objectives:[objective]}},resource]});}
describe('generated goal compatibility with the real native host',()=>{
 it.each(service.MAX_TYPES)('accepts every goal offered by the host for %s',type=>{
  const r=target(type);for(const option of optionsFor(r)){
   const o=goal(option.kind,{...(option.gameType?{gameType:option.gameType}:{}),...(option.minutes?{minutes:option.minutes}:{})});
   const result=compose(r,o);expect(result.ok,JSON.stringify(result.errors)).toBe(true);
   const exported=service.exportPack(result.value);expect(exported.ok).toBe(true);
   expect(normalize(JSON.parse(exported.json).history[0].data).objectives).toEqual([o]);
  }
 });
 it.each(Object.entries(outlineGames))('matches the %s game to its outline renderer', (structureType,gameType)=>{
  const r=target('outline',{...data.outline,structureType});expect(compose(r,goal('game',{gameType})).ok).toBe(true);
  const wrong=gameType==='outlineSort'?'vennDiagram':'outlineSort';expect(compose(r,goal('game',{gameType:wrong})).errors.some(e=>e.code==='incompatible-goal-resource')).toBe(true);
 });
 it.each([
  ['simplified',goal('game',{gameType:'crossword'})],
  ['simplified',goal('completed')],
  ['glossary',goal('responded')],
  ['quiz',goal('game',{gameType:'matching'})],
  ['math',goal('completed')]
 ])('rejects incompatible completion rules for %s',(type,o)=>{expect(compose(target(type),o).errors.some(e=>e.code==='incompatible-goal-resource')).toBe(true);});
 it.each(['visited','responded','completed','time'])('requires a resource link for %s',kind=>{
  const o=goal(kind,{minutes:10});delete o.resourceRef;expect(compose(target('quiz'),o).errors.some(e=>e.code==='missing-goal-resource')).toBe(true);
 });
 it.each([0,-1,NaN,Infinity,'10',null])('rejects invalid time observation %j',minutes=>{expect(compose(target('simplified'),goal('time',{minutes})).errors.some(e=>e.code==='invalid-time-objective')).toBe(true);});
 it('keeps legacy unbound game goals when a compatible resource is present',()=>{
  const o=goal('game',{gameType:'matching'});delete o.resourceRef;expect(compose(target('glossary'),o).ok).toBe(true);
  expect(compose(target('simplified'),o).errors.some(e=>e.code==='unavailable-goal-game')).toBe(true);
 });
 it.each([undefined,'',{},'made-up-game'])('rejects missing or unsupported game identifiers %j',gameType=>{expect(compose(target('glossary'),goal('game',{gameType})).ok).toBe(false);});
 it('requires registry coverage when the host offers a new goal',()=>{expect(service.MAX_TYPES.every(type=>Object.hasOwn(data,type))).toBe(true);});
});

it('keeps the headless registry identical to the current native host registry',()=>{
 const moduleText=fs.readFileSync('agent_core_resource_pack_module.js','utf8'),from=moduleText.indexOf('// BEGIN NATIVE PACK GOAL CAPABILITIES'),to=moduleText.indexOf('// END NATIVE PACK GOAL CAPABILITIES');
 expect(from).toBeGreaterThan(-1);expect(to).toBeGreaterThan(from);
 const local=new Function(moduleText.slice(from,to)+';return {outlineGames:PACK_OUTLINE_GAMES,capabilities:PACK_GOAL_CAPABILITIES};')();
 expect(local).toEqual({outlineGames,capabilities});
});
