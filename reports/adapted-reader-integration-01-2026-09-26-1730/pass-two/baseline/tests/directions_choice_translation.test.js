import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
beforeAll(()=>{global.React=window.React=require(resolve('desktop/web-app/node_modules/react'));loadAlloModule('phase_k_helpers_module.js');});
describe('directions translate choice-board prose while retaining navigation identity',()=>{
  it('translates every visible board field and ignores model changes to IDs and rules',async()=>{
    const original={id:'directions-en',type:'directions',title:'Pick a task',data:{body:'Choose one.',softGate:true,objectives:[{id:'goal',label:'Complete a task',kind:'game',resourceRef:'activity-a'}],choiceBoard:{enabled:true,title:'Your choice',prompt:'Pick one first.',items:[{resourceId:'activity-a',label:'Read',description:'Read the source',icon:'book'},{resourceId:'activity-b',label:'Write',description:'Write a paragraph'}]}}};
    const translated={title:'Elige una tarea',body:'Elige una.',labels:['Completa una tarea'],choiceBoard:{title:'Tu elección',prompt:'Elige una primero.',items:[{resourceId:'evil',label:'Leer',description:'Lee la fuente'},{label:'Escribir',description:'Escribe un párrafo'}]}};
    const callGemini=vi.fn().mockResolvedValue(JSON.stringify(translated));
    const result=await window.AlloModules.PhaseKHelpers.translateResourceItem(original,'Spanish',{callGemini,cleanJson:text=>text,warnLog:()=>{}});
    const prompt=callGemini.mock.calls[0][0]; expect(prompt).toContain('Your choice'); expect(prompt).toContain('Read the source');
    expect(result.data.choiceBoard).toEqual({enabled:true,title:'Tu elección',prompt:'Elige una primero.',items:[{resourceId:'activity-a',label:'Leer',description:'Lee la fuente',icon:'book'},{resourceId:'activity-b',label:'Escribir',description:'Escribe un párrafo'}]});
    expect(result.data.objectives[0]).toEqual({...original.data.objectives[0],label:'Completa una tarea'});
    expect(result.data.softGate).toBe(true); expect(original.data.choiceBoard.items[0].label).toBe('Read');
  });
  it('remaps both choice cards and goal references in the actual translate-all handoff',()=>{
    const source=readFileSync('AlloFlowANTI.txt','utf8');
    const start=source.indexOf('        for (const newItem of newItems) {',source.indexOf('// Directions goal tethers must follow the translation'));
    const end=source.indexOf('        setHistory(prev => [...prev, ...newItems]);',start);
    const items=[{type:'directions',data:{objectives:[{resourceRef:'a'}],choiceBoard:{items:[{resourceId:'a'},{resourceId:'b'}]}}}];
    new Function('newItems','_translatedIdMap',source.slice(start,end))(items,{a:'a-es',b:'b-es'});
    expect(items[0].data.objectives[0].resourceRef).toBe('a-es');
    expect(items[0].data.choiceBoard.items.map(card=>card.resourceId)).toEqual(['a-es','b-es']);
  });
});
