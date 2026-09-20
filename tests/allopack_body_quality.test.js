import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{factHash}=require('../dev-tools/lib/allopack_fact_review.cjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const source=read('allopacks/body_systems_grade6.allopack.json'),illustrated=read('allopacks/illustrated/body_systems_grade6.allopack.json');
const get=(p,t)=>p.history.find(r=>r.type===t).data;
const clean=x=>JSON.parse(JSON.stringify(x),(k,v)=>/^(image|iconUrl|iconAlt)/.test(k)?undefined:v);
describe('Body Systems aligned investigation',()=>{
 it('keeps all native lesson content identical between editions, apart from picture directions',()=>{
  for(const r of source.history){const actual=clean(illustrated.history.find(x=>x.id===r.id));if(r.type==='directions')actual.data.body=actual.data.body.split('\n\nPicture panels:')[0];expect(actual).toEqual(clean(r));}
 });
 for(const [edition,p] of [['original',source],['illustrated',illustrated]]){
  it(edition+' supplies complete fictional data for the required calculations',()=>{
   const c=get(p,'applied-challenge');expect(c.brief.context).toContain('not measurements of real people');
   const rows=[...c.brief.context.matchAll(/Case ([ABC]): rest (\d+) \/ (\d+); just after (\d+) \/ (\d+); two minutes after (\d+) \/ (\d+)/g)];
   expect(rows.map(row=>[row[1],...row.slice(2).map(Number).map(n=>n*4)])).toEqual([
    ['A',16,72,24,96,16,76],['B',12,68,20,88,16,72],['C',16,80,20,92,16,80]
   ]);
   expect(c.instructions).toContain('No exercise or personal measurements');expect(c.brief.criteria.join(' ')).not.toContain('volunteers');
   expect(c.brief.openQuestions.join(' ')).toContain('exact time of recovery');expect(c.brief.constraints.join(' ')).toContain('prove a causal mechanism');
  });
  it(edition+' retains references and marks revised claims pending review with matching hashes',()=>{
   const m=get(p,'memory-aid'),c=get(p,'applied-challenge');
   for(const r of [m,c])expect(p.history.some(x=>x.id===r.lessonRef.resourceId)).toBe(true);
   for(const node of [...m.cards,c.brief]){expect(node.factVerified).toBe(false);expect(node.factReview.status).toBe('pending-educator-review');expect(node.factReview.factsHash).toBe(factHash(node.essentialFacts||node.lockedLessonFacts));expect(node.factReview.sources).toContain('https://www.nhlbi.nih.gov/health/heart/heart-beats');}
   expect(m.cards[1].studentPrompt).toContain('response format');expect(m.cards[2].scaffoldStarter).not.toContain('my nervous system');
  });
  it(edition+' distinguishes digestive pathways and circulation direction',()=>{
   expect(get(p,'simplified')).toContain('These names tell direction, not oxygen level');
   expect(get(p,'simplified')).toContain('many dietary fats first enter lymph');
   expect(get(p,'outline').branches[1].items[0]).toContain('arteries lead away');
   for(const q of get(p,'quiz').questions.filter(q=>q.type==='mcq')){expect(q.options.filter(o=>o===q.correctAnswer)).toHaveLength(1);expect(new Set(q.options).size).toBe(q.options.length);}
  });
 }
});
