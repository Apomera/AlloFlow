import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const source = fs.readFileSync('video_studio/video_studio.html', 'utf8');
const start = source.indexOf('  function cleanProjectEditorState(');
const end = source.indexOf('\n  function ', start + 5);
if (start < 0 || end < 0) throw Error('Project editor sanitizer missing');
const clean = new Function('cleanTakeExportSettings', 'return (' + source.slice(start, end) + ')')(value => value && typeof value === 'object' ? {titleInput: String(value.titleInput || '').slice(0,120)} : null);
const state = changes => ({version:1, applyToSource:true, ...changes});
describe('portable editor state validation', () => {
  it('accepts only supported editable source state', () => {
    for (const value of [null, [], {}, state({version:2}), state({applyToSource:false})]) expect(clean(value,10)).toBeNull();
  });
  it('preserves fractional trims without consuming the entire video', () => {
    expect(clean(state({trim:{start:0.325,end:0.275}}),2.160659).trim).toEqual({start:0.325,end:0.275});
    const trim=clean(state({trim:{start:20,end:20}}),2).trim;
    expect(trim.start+trim.end).toBeCloseTo(1.9);
  });
  it('defaults invalid trim values and handles empty media duration', () => {
    expect(clean(state({trim:{start:Infinity,end:-3}}),10).trim).toEqual({start:0,end:0});
    expect(clean(state({trim:{start:3,end:4}}),NaN).trim).toEqual({start:0,end:0});
  });
  it('drops invalid zoom times, bounds geometry, and gives zooms distinct IDs', () => {
    const result=clean(state({zooms:[null,{t:-1},{t:Infinity},{t:10},{id:'same',t:1,x:-8,y:5,scale:90,dur:999},{id:'same',t:2}]}),10);
    expect(result.zooms).toHaveLength(2);
    expect(result.zooms[0]).toMatchObject({t:1,x:0,y:1,scale:3,dur:60});
    expect(result.zooms[0].id).not.toBe(result.zooms[1].id);
  });
  it('bounds imported payloads and leaves the caller state unchanged', () => {
    const original=state({name:'n'.repeat(300),zooms:Array.from({length:600},()=>({t:1})),trim:{start:0.2,end:0.4}});
    const before=JSON.stringify(original),result=clean(original,10);
    expect(result.name).toHaveLength(180);expect(result.zooms).toHaveLength(500);expect(JSON.stringify(original)).toBe(before);
  });
});
