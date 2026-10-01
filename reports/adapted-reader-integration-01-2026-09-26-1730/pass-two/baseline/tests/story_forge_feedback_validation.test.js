import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url); let normalize;
beforeAll(() => { globalThis.React = window.React = require(resolve('desktop/web-app/node_modules/react')); window.AlloIcons = new Proxy({}, {get: () => () => null}); loadAlloModule('story_forge_module.js'); normalize = window.AlloModules.StoryForge._meta.normalizeStoryForgeFeedback; });
const valid = () => ({scores:[{criteria:'Story',score:'4/5',comment:'Clear arc'}],totalScore:'99/100',feedback:{glow:'Strong opening',grow:'Develop the setting'}});
describe('Story Forge feedback validation', () => {
  it('derives the total from validated criterion scores and leaves the input unchanged', () => { const value=valid(); const result=normalize(value); expect(result.totalScore).toBe('4/5'); expect(value.totalScore).toBe('99/100'); expect(result.vocabScores).toEqual([]); });
  it('accepts numeric and fractional five-point scores', () => {const value=valid(); value.scores.push({criteria:'Detail',score:3.5}); expect(normalize(value).totalScore).toBe('7.5/10');});
  it('rejects empty or malformed response structures before rendering', () => { for(const value of [null,{},[],{...valid(),scores:{}},{...valid(),scores:[]},{...valid(),scores:[null]},{...valid(),feedback:{glow:{},grow:'x'}},{...valid(),feedback:{glow:'',grow:'x'}}])expect(()=>normalize(value)).toThrow();});
  it('rejects non-finite, out-of-range, and wrong-scale scores', () => {for(const score of [NaN,Infinity,-1,6,'6/5','3/10','four',{}])expect(()=>normalize({...valid(),scores:[{criteria:'Story',score}]})).toThrow();});
  it('rejects duplicate criteria and oversized collections', () => {const value=valid(); expect(()=>normalize({...value,scores:[...value.scores,{criteria:' STORY ',score:2}]})).toThrow();expect(()=>normalize({...value,scores:Array.from({length:33},(_,i)=>({criteria:String(i),score:3}))})).toThrow();expect(()=>normalize({...value,vocabScores:Array(65).fill({term:'x',status:'correct'})})).toThrow();});
  it('validates vocabulary types and bounds rendered comments', () => {const value=valid();expect(()=>normalize({...value,vocabScores:{}})).toThrow();expect(()=>normalize({...value,vocabScores:[{term:'x',status:'invented'}]})).toThrow();expect(()=>normalize({...value,vocabScores:[{term:{},status:'correct'}]})).toThrow();value.scores[0].comment='a'.repeat(3000);expect(normalize(value).scores[0].comment).toHaveLength(2000);});
});
