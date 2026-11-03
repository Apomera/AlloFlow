import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{factHash}=require('../dev-tools/lib/allopack_fact_review.cjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const pack=read('allopacks/current/body_systems_grade6.allopack.json');
const get=(p,t)=>p.history.find(r=>r.type===t).data;
const clean=x=>JSON.parse(JSON.stringify(x),(k,v)=>/^(image|iconUrl|iconAlt|visual)/.test(k)?undefined:v);
const digest=x=>require('node:crypto').createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,16);
describe('Body Systems aligned investigation',()=>{
 it('keeps the native lesson content of the retired text edition, apart from pictures and picture directions',()=>{
  // The text-only edition was retired 2026-11-02. Digests of its picture-free resources, pinned from git HEAD
  // (allopacks/body_systems_grade6.allopack.json); a deliberate content edit must re-pin the changed resource.
  const source={"bs-directions":"31d179230dd926d9","bs-reading":"4d82c1f91f1b5618","bs-glossary":"bdfc14e1ad3e1e22","bs-anchor":"1fa0592d7fcc18df","bs-outline":"81461c8e80985152","bs-memory":"0c3bd5dc1976813d","bs-sort":"c82aa19892ae4c71","bs-quiz":"075d3f2f25b9e8c7","bs-notes":"7a99e162fe3fce60","bs-faq":"2a061c87baf804c0","bs-challenge":"754888760b5af15e"};
  for(const [id,hash] of Object.entries(source)){const actual=clean(pack.history.find(x=>x.id===id));if(actual.type==='directions'){expect(actual.data.body).toContain('\n\nPicture panels:');actual.data.body=actual.data.body.split('\n\nPicture panels:')[0];}expect(digest(actual),id).toBe(hash);}
 });
 for(const [edition,p] of [['current',pack]]){
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
