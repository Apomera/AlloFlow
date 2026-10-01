import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url);let api;
beforeAll(()=>{globalThis.React=window.React=require(resolve('desktop/web-app/node_modules/react'));window.AlloIcons=new Proxy({},{get:()=>()=>null});loadAlloModule('story_forge_module.js');api=window.AlloModules.StoryForge._meta;});

describe('safe lesson proposals',()=>{
  it('normalizes lesson frames without deleting the authored ending',()=>{
    const proposal=api.prepareStoryForgeLessonImport({type:'sentence-frames',data:' 1. A new opening\r\n\r\n'});
    const original=[{id:'one',text:'My opening'},{id:'two',text:'My ending'}];
    const merged=api.mergeStoryForgePlan(original,proposal.suggestions,['one','two']);
    expect(merged.map(p=>p.text)).toEqual(['My opening','My ending']);
    expect(merged[0].scaffoldFrame).toBe('A new opening');
    expect(original[0]).not.toHaveProperty('scaffoldFrame');
  });
  it('keeps short timeline events and reports when only eight fit',()=>{
    const proposal=api.prepareStoryForgeLessonImport({type:'timeline',data:Array.from({length:10},(_,i)=>'Day '+i).join('\n')});
    expect(proposal.total).toBe(10);expect(proposal.suggestions).toHaveLength(8);expect(proposal.suggestions[0].scaffoldFrame).toBe('Day 0');
  });
  it('rejects blank and malformed resources before they mutate state',()=>{
    for(const value of [null,{type:'timeline',data:' \n '},{type:'sentence-frames',data:{}},{type:'glossary',data:[null,{},17]},{type:'simplified',data:{originalText:{}}},{type:'unknown',data:'hello'}])expect(()=>api.prepareStoryForgeLessonImport(value)).toThrow();
  });
  it('merges vocabulary without replacing existing definitions or duplicating normalized terms',()=>{
    const existing=[{term:'Café',definition:'My definition'}];
    const incoming=api.prepareStoryForgeLessonImport({type:'glossary',data:{terms:[{word:'CAFE\u0301',def:'Different'},{term:'bridge',definition:'Crossing'}]}});
    expect(api.mergeStoryForgeVocabulary(existing,incoming.terms)).toEqual([{term:'Café',definition:'My definition'},{term:'bridge',definition:'Crossing'}]);
    expect(existing).toHaveLength(1);
  });
  it('keeps the vocabulary persistence limit and preserves existing goals',()=>{
    const existing=Array.from({length:64},(_,i)=>({term:'word'+i,definition:''}));
    expect(api.mergeStoryForgeVocabulary(existing,[{term:'extra'}])).toEqual(existing);
  });
  it('normalizes starting ideas without mutating the input resource',()=>{
    const resource={type:'simplified',data:{originalText:'  A hidden garden.  '}};
    expect(api.prepareStoryForgeLessonImport(resource)).toMatchObject({kind:'prompt',prompt:'A hidden garden.'});
    expect(resource.data.originalText).toBe('  A hidden garden.  ');
  });
});
describe('section recovery requirements',()=>{
  it('checkpoints dialogue and media even when the caption is empty',()=>{
    const section={id:'one',text:''};
    expect(api.storyForgeSectionHasWork(section,[{one:{speech:'Wait!'}}])).toBe(true);
    expect(api.storyForgeSectionHasWork(section,[{one:{imageUrl:'data:image/png;base64,fixture'}}])).toBe(true);
    expect(api.storyForgeSectionHasWork({...section,scaffoldFrame:'Prompt'},[])).toBe(true);
    expect(api.storyForgeSectionHasWork(section,[{}])).toBe(false);
  });
});
