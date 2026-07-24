import{beforeAll,describe,expect,it}from'vitest';
import fs from'node:fs';
import{resolve}from'node:path';
import{loadAlloModule}from'./setup.js';
const read=file=>fs.readFileSync(resolve(process.cwd(),file),'utf8');
let pack,Hub;
beforeAll(()=>{window.React=window.React||{useState:value=>[value,()=>{}],useEffect:()=>{},useRef:()=>({current:null}),createElement:()=>null,Fragment:'fragment'};loadAlloModule('test_prep_hub_module.js');Hub=window.AlloModules.TestPrepHub;pack=Hub.listPacks().find(item=>item.id==='praxis-plt-grades-7-12-5624')});
describe('PLT Grades 7–12 5624 suite',()=>{
  it('registers exact official structure',()=>{expect(pack).toMatchObject({simulationItemCount:70,simulationTimeMinutes:70,officialSelectedResponseCount:70,officialConstructedResponseCount:4,officialTotalTimeMinutes:120});expect(pack.items).toHaveLength(500);expect(pack.items.slice(0,70).reduce((counts,item)=>({...counts,[item.domainId]:(counts[item.domainId]||0)+1}),{})).toEqual({'students-as-learners':21,'instructional-process':21,assessment:14,'professional-development-leadership-community':14})});
  it('balances diagnostics and explains choices',()=>{for(let batch=0;batch< 5;batch+=1)expect(pack.items.slice(batch*100,batch*100+100).reduce((counts,item)=>(counts[item.answerIndex]++,counts),[0,0,0,0])).toEqual([25,25,25,25]);expect(new Set(pack.items.map(item=>item.prompt)).size).toBe(500);expect(pack.items.every(item=>item.rationale.length>=120&&item.choiceRationales.length===4)).toBe(true);expect(pack.items.every(item=>!/\ba eighth|\ba eleventh|\ban secondary/i.test([item.prompt,...item.choices,item.rationale].join(' ')))).toBe(true)});
  it('ships native learning and eight case workshops',()=>{const library=JSON.parse(read('test_prep/plt_7_12_5624_learning_library.json'));expect(library.summary).toMatchObject({chapters:12,sections:48,knowledgeChecks:60,flashcards:75,memoryAids:20,constructedResponseWorkshops:8});expect(library.constructedResponseWorkshops.every(workshop=>workshop.reviewNote.includes('does not score written responses'))).toBe(true)});
  it('publishes passing mirrored QA',()=>{const qa=JSON.parse(read('test_prep/plt_7_12_5624_native_qa.json'));expect(qa.summary).toMatchObject({passedItems:500,findings:[],status:'pass'});for(const name of['plt_7_12_5624_items.json','plt_7_12_5624_pack.json','plt_7_12_5624_learning_library.json','plt_7_12_5624_native_qa.json','plt_7_12_5624_learning_library_qa.json'])expect(read('desktop/web-app/public/test_prep/'+name)).toBe(read('test_prep/'+name))});
});
