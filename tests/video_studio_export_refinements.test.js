import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const source=fs.readFileSync('video_studio/video_studio.html','utf8');
function extract(name){const start=source.indexOf('  function '+name+'(');const end=source.indexOf('\n  }',start)+4;if(start<0)throw Error(name);return source.slice(start,end);}
const safeName=new Function('return ('+extract('safeName')+')')();
const begin=source.indexOf('    var cues = t.captions.filter',source.indexOf('  async function doExport'));
const end=source.indexOf('    var zooms =',begin);
if(begin<0||end<0)throw Error('Export caption pipeline missing');
const clip=new Function('t','seg',source.slice(begin,end)+'return cues;');
const range={duration:3,segments:[{start:2,end:5}]};
describe('export caption boundaries',()=>{
 it('clips both boundaries and rebases captions to the kept video',()=>{expect(clip({captions:[{start:0,end:3,text:'beginning'},{start:4,end:9,text:'ending'}]},range)).toEqual([{start:0,end:1,text:'beginning'},{start:2,end:3,text:'ending'}]);});
 it('preserves short cues without inflating them past the video',()=>{const result=clip({captions:[{start:4.95,end:8,text:'short'}]},range);expect(result[0].end-result[0].start).toBeCloseTo(0.05);expect(result[0].end).toBe(3);});
 it('drops invalid, empty, reversed, and outside cues',()=>{expect(clip({captions:[null,{start:NaN,end:3,text:'bad'},{start:3,end:4,text:' '},{start:4,end:3,text:'backwards'},{start:0,end:2,text:'before'},{start:5,end:6,text:'after'}]},range)).toEqual([]);});
 it('sorts without changing the source and accepts numeric timing strings',()=>{const captions=[{start:'4',end:'10',text:'last'},{start:2,end:3,text:'first'}];const before=JSON.stringify(captions);expect(clip({captions},range).map(c=>c.text)).toEqual(['first','last']);expect(JSON.stringify(captions)).toBe(before);});
});
describe('download filenames',()=>{
 it.each([['درس العلوم','درس_العلوم'],['Leçon de français','Leçon_de_français'],['科学の授業','科学の授業']])('preserves %s', (title,expected)=>expect(safeName(title)).toBe(expected));
 it('removes unsafe punctuation and avoids reserved/empty names',()=>{expect(safeName('CON')).toBe('video_CON');expect(safeName('///')).toBe('teacher_video');expect(safeName('one: two?')).toBe('one_two');expect(safeName('x'.repeat(200)).length).toBe(100);});
});
describe('prepared export source',()=>{
 const original={id:'original'},selected={id:'selected'};
 const resolve=new Function('currentTake','takes','return ('+extract('sceneTakeForExport')+')')(()=>selected,[original,selected]);
 it('resolves the exported take independently of editor selection',()=>expect(resolve({takeId:'original'})).toBe(original));
 it('never substitutes another video when the original was removed',()=>expect(resolve({takeId:'missing'})).toBeNull());
});
