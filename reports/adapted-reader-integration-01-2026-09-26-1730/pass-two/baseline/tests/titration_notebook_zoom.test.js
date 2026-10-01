import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const helpers=source.slice(source.indexOf('function titrationBenchNotebook('),source.indexOf('function TitrationBenchTools('));
const api=new Function(helpers+';return {frame:titrationNotebookPlotFrame,nearest:titrationNotebookNearest,series:titrationNotebookSeries};')();
const row=(id,volume,value=7,extra={})=>({id,volume,value,preset:'sa_sb',setup:'HCl + NaOH',axis:'pH',...extra});
const rows=[row(1,0,1),row(2,24.9,3.7),row(3,25,7),row(4,25.1,10.3),row(5,25.6,11.5)];
describe('notebook plot close-up',()=>{
 it('separates nearby endpoint volumes while retaining the saved dataset',()=>{
  const before=JSON.stringify(rows),all=api.frame(rows),near=api.frame(rows,4);
  expect(all.zoomed).toBe(false);expect(all.points).toHaveLength(5);expect(near.zoomed).toBe(true);expect(near.total).toBe(5);expect(near.points.map(p=>p.id)).toEqual([2,3,4,5]);
  expect(near.volume.low).toBeCloseTo(24.6);expect(near.volume.high).toBeCloseTo(25.6);
  expect(near.points[2].x-near.points[1].x).toBeGreaterThan(10*(all.points[3].x-all.points[2].x));expect(JSON.stringify(rows)).toBe(before);
 });
 it('includes exact window boundaries without including more distant readings',()=>{
  const f=api.frame([row(1,24.5),row(2,25),row(3,25.5),row(4,24.49),row(5,25.51)],2);
  expect(f.points.map(p=>p.id)).toEqual([1,2,3]);expect(f.points[0].x).toBe(74);expect(f.points[2].x).toBe(450);
 });
 it('clips volume windows to zero and the notebook maximum',()=>{
  const low=api.frame([row(1,0)],1),high=api.frame([row(1,150)],1);
  expect(low.volume).toEqual({low:0,high:0.5});expect(high.volume).toEqual({low:149.5,high:150});expect(low.points[0].x).toBe(74);expect(high.points[0].x).toBe(450);
 });
 it('fits the response axis to visible observations, retaining redox precision',()=>{
  const f=api.frame([row(1,0,-10,{axis:'E'}),row(2,5,1.531,{axis:'E'}),row(3,5.1,1.532,{axis:'E'})],2);
  expect(f.axis).toBe('E');expect(f.response.low).toBeCloseTo(1.521);expect(f.response.high).toBeCloseTo(1.542);expect(f.points).toHaveLength(2);
 });
 it('keeps repeated-volume readings selectable without connecting points',()=>{
  const f=api.frame([row(1,25),row(2,25)],1);expect(f.points).toHaveLength(2);expect(f.points[0].x).toBe(f.points[1].x);expect(api.nearest(f,f.points[0].x,f.points[0].y)).toBe(2);
 });
 it('defaults a missing zoom target to the full saved range',()=>{
  const f=api.frame(rows,99);expect(f.zoomed).toBe(false);expect(f.points).toHaveLength(5);
  const remaining=rows.filter(r=>r.id!==4),series=api.series(remaining,4),next=api.frame(series.group.records,series.selected.id);expect(next.zoomed).toBe(true);expect(next.points.some(p=>p.id===series.selected.id)).toBe(true);
 });
 it('rejects incompatible or unplottable input even when zooming',()=>{
  expect(api.frame([],1)).toBeNull();expect(api.frame([row(1,0),row(2,20,3,{axis:'E'})],1)).toBeNull();expect(api.frame([row(1,0,-Number.MAX_VALUE),row(2,0.1,Number.MAX_VALUE)],1)).toBeNull();
 });
 it('keeps coordinates finite and bounded for every selected saved volume',()=>{
  const dense=Array.from({length:40},(_,i)=>row(i+1,24+i*0.1,1+i/3));
  for(const r of dense){const f=api.frame(dense,r.id);expect(f.points.some(p=>p.id===r.id)).toBe(true);for(const p of f.points){expect(p.x).toBeGreaterThanOrEqual(74);expect(p.x).toBeLessThanOrEqual(450);expect(p.y).toBeGreaterThan(42);expect(p.y).toBeLessThan(218);}}
 });
});
