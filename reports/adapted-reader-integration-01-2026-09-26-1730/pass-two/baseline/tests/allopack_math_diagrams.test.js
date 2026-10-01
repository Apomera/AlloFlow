import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
const base='allopacks/media/',slugs=['decimal_place_value_grade5','probability_models_grade7'];
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const cells=s=>[...s.matchAll(/<rect[^>]*data-cell="true"[^>]*>/g)].map(m=>m[0]);
const colored=s=>cells(s).filter(s=>s.includes('data-shaded="true"')).length;
const attr=(s,k)=>Number(s.match(new RegExp(' '+k+'="([^"]+)"'))[1]);
describe('exact math artwork content',()=>{
it('represents each decimal sorting value using equal cells and an identical whole',()=>{const slug=slugs[0],pack=read('allopacks/'+slug+'.allopack.json'),items=pack.history.find(r=>r.type==='concept-sort').data.items;const areas=[];for(let i=0;i<6;i++){const s=fs.readFileSync(base+slug+'/dpv-sort-'+(i+1)+'.svg','utf8'),cs=cells(s);expect(cs).toHaveLength(1000);expect(colored(s)/1000).toBe(Number(items[i].content));const area=cs.map(c=>attr(c,'width')*attr(c,'height'));expect(new Set(area).size).toBe(1);areas.push(area.reduce((a,b)=>a+b,0));}expect(new Set(areas).size).toBe(1);});
it('makes equivalent decimal cards visually identical',()=>{const dir=base+slugs[0]+'/';expect(fs.readFileSync(dir+'dpv-sort-1.svg','utf8')).toBe(fs.readFileSync(dir+'dpv-sort-2.svg','utf8'));});
it('keeps the tenth, hundredth, thousandth and key comparisons numerically exact',()=>{const dir=base+slugs[0]+'/';for(const [id,n,k] of [['term-4',10,1],['term-5',100,1],['term-6',1000,1],['anchor-1',110,11],['anchor-2',110,51],['anchor-3',200,66],['lesson-2',110,66],['lesson-3',200,100],['lesson-4',200,66]]){const s=fs.readFileSync(dir+'dpv-'+id+'.svg','utf8');expect(cells(s).length,id).toBe(n);expect(colored(s),id).toBe(k);}});
it('preserves exact bag contents and separates targets from bag counters',()=>{const dir=base+slugs[1]+'/';for(let i=1;i<=6;i++){const s=fs.readFileSync(dir+'prb-sort-'+i+'.svg','utf8');const circles=[...s.matchAll(/<circle[^>]*data-counter="([^"]+)"[^>]*>/g)].map(m=>({color:m[1],y:attr(m[0],'cy'),r:attr(m[0],'r')}));const inside=circles.filter(c=>c.y>=430);expect(inside).toHaveLength(4);expect(new Set(inside.map(c=>c.r)).size).toBe(1);expect(inside.filter(c=>c.color==='red')).toHaveLength(i===6?4:1);expect(inside.filter(c=>c.color==='blue')).toHaveLength(i===6?0:3);const targets=circles.filter(c=>c.y<430).map(c=>c.color);expect(targets).toEqual([['green'],['yellow'],['red'],['blue'],['red','blue'],['red']][i-1]);}});
it('shows seven red results in twenty trials without inventing a guaranteed sequence',()=>{const s=fs.readFileSync(base+slugs[1]+'/prb-lesson-6.svg','utf8');expect([...s.matchAll(/data-counter=/g)]).toHaveLength(20);expect([...s.matchAll(/data-counter="red"/g)]).toHaveLength(7);expect([...s.matchAll(/data-counter="blue"/g)]).toHaveLength(13);});
it('contains no embedded instructional text in exact diagram sources',()=>{for(const slug of slugs){const m=read(base+slug+'/manifest.json');for(const a of m.assets.filter(a=>a.vectorFile)){const s=fs.readFileSync(base+slug+'/'+a.vectorFile,'utf8');expect(s).not.toMatch(/<(text|foreignObject|image)\b/);}}});
});

