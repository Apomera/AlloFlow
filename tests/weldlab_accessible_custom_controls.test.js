import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, pointer } from './helpers/weldlab_interaction_mount.js';
import { stripWeldlabCoverageFixes } from './helpers/weldlab_accessible_coverage_restore.js';

beforeEach(freshTool);
afterEach(unmountState);
const query=selector=>node().querySelector(selector);
const modifications=[{altKey:true},{ctrlKey:true},{metaKey:true},{defaultPrevented:true}];
async function key(target,name,flags={}){await pointer(target,'keyDown',{key:name,...flags});}

describe('Custom controls preserve modified and previously handled keys',()=>{
 it('keeps radio shortcuts from changing saved selections while plain arrows still work',async()=>{
  const app=await mountState({view:'beadLab',bl_process:'mig'});
  const group=query('[role="radiogroup"][aria-label="Welding process"]'),first=group.querySelector('[role="radio"]');
  const saved=JSON.stringify(app.latest()),writes=app.writes.length;first.focus();
  for(const flags of modifications){await key(first,'ArrowRight',flags);expect(document.activeElement).toBe(first);expect(JSON.stringify(app.latest())).toBe(saved);expect(app.writes).toHaveLength(writes);}
  await key(first,'ArrowRight');expect(document.activeElement).not.toBe(first);expect(app.latest().bl_process).not.toBe('mig');
 });
 it('leaves Joint Catalog modified navigation alone and retains ordinary End activation',async()=>{
  const app=await mountState({view:'jointCatalog',jc_tab:'butt'});
  const tabs=[...query('[role="tablist"][aria-label="Joint type tabs"]').querySelectorAll('[role="tab"]')];tabs[0].focus();
  const saved=JSON.stringify(app.latest()),writes=app.writes.length;
  for(const flags of modifications){await key(tabs[0],'End',flags);expect(document.activeElement).toBe(tabs[0]);expect(JSON.stringify(app.latest())).toBe(saved);expect(app.writes).toHaveLength(writes);}
  await key(tabs[0],'End');expect(document.activeElement).toBe(tabs.at(-1));expect(tabs.at(-1).getAttribute('aria-selected')).toBe('true');
 });
 it('preserves Defect Hunt reticle position for modified keys',async()=>{
  await mountState({view:'defectHunt'});const surface=query('[role="application"]');surface.focus();const before=query('#dh2-readout').textContent;
  for(const flags of modifications){await key(surface,'ArrowRight',flags);expect(query('#dh2-readout').textContent).toBe(before);}
  await key(surface,'ArrowRight');expect(query('#dh2-readout').textContent).not.toBe(before);
 });
 it('does not change Bead hand speed for modified arrows and retains plain speed controls',async()=>{
  const app=await mountState({view:'beadLab',arc_handsOn:true,arc_handSpeed:12});const plate=query('canvas[tabindex="0"]');plate.focus();
  const speed=()=>query('input[aria-label="Hand speed for Hold to weld and the Right arrow"]');const saved=JSON.stringify(app.latest()),writes=app.writes.length;
  for(const flags of modifications){await key(plate,'ArrowUp',flags);expect(speed().value).toBe('12');expect(JSON.stringify(app.latest())).toBe(saved);expect(app.writes).toHaveLength(writes);}
  await key(plate,'ArrowUp');expect(speed().value).toBe('13');
 });
 it('does not change Live Run travel settings for modified keys',async()=>{
  await mountState({view:'speedChallenge'});const zone=query('[role="group"][tabindex="0"]');zone.focus();
  const before=node().textContent;
  for(const flags of modifications){await key(zone,'ArrowRight',flags);expect(node().textContent).toBe(before);}
  await key(zone,'ArrowRight',{shiftKey:true});expect(node().textContent).not.toBe(before);
  expect(document.getElementById('allo-live-weldlab').textContent).toMatch(/Travel speed/);
 });
 it('does not mutate robot points, arc or cursor for modified shortcuts',async()=>{
  const app=await mountState({view:'robotic',rob_sect:'pendant',tech2_rob_prog:[{x:4,y:6,m:'J',w:false}]});
  const grid=query('[role="application"][aria-describedby="tech2-rob-help"]');grid.focus();const label=grid.getAttribute('aria-label'),saved=JSON.stringify(app.latest()),writes=app.writes.length;
  for(const flags of modifications)for(const name of ['ArrowRight','w','l','r','Backspace','Enter']){await key(grid,name,flags);expect(grid.getAttribute('aria-label')).toBe(label);expect(JSON.stringify(app.latest())).toBe(saved);expect(app.writes).toHaveLength(writes);}
  await key(grid,'ArrowRight');expect(grid.getAttribute('aria-label')).not.toBe(label);
 });
 it('keeps the inspection gauge and reading log unchanged for modified keys, while retaining quarter-inch and Shift steps',async()=>{
  const app=await mountState({view:'inspection',insp_sect:'bench'});const gauge=query('svg[role="slider"]');gauge.focus();const saved=JSON.stringify(app.latest()),writes=app.writes.length;
  for(const flags of modifications)for(const name of ['ArrowRight','End','Enter']){await key(gauge,name,flags);expect(gauge.getAttribute('aria-valuenow')).toBe('0');expect(JSON.stringify(app.latest())).toBe(saved);expect(app.writes).toHaveLength(writes);}
  await key(gauge,'ArrowRight');expect(gauge.getAttribute('aria-valuenow')).toBe('0.25');
  await key(gauge,'ArrowRight',{shiftKey:true});expect(gauge.getAttribute('aria-valuenow')).toBe('1.25');
  await key(gauge,'Enter');expect(app.latest().insp2_bench.uc1.recs).toEqual([1.25]);
 });
});

describe('Visible control labels and named information groups',()=>{
 it('includes the currently displayed robot move mode in its accessible name before and after editing',async()=>{
  const app=await mountState({view:'robotic',rob_sect:'pendant',tech2_rob_prog:[{x:4,y:6,m:'J',w:false}]});
  const move=[...node().querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.includes('Point 1: switch move type'));
  expect(move.textContent).toBe('Joint');expect(move.getAttribute('aria-label')).toMatch(/^Joint: Point 1:/);
  await click(move);expect(move.textContent).toBe('Linear');expect(move.getAttribute('aria-label')).toMatch(/^Linear: Point 1:/);expect(app.latest().tech2_rob_prog[0].m).toBe('L');
 });
 it('gives the inspection legend an explicit group role that supports its existing accessible name',async()=>{
  await mountState({view:'inspection',insp_sect:'visual'});const legend=query('[role="group"][aria-label="Diagram legend"]');
  expect(legend).toBeTruthy();expect(legend.textContent).toContain('Yellow outline');expect(legend.textContent).toContain('Dashed cyan circle');
 });
 it('preserves every earlier source byte outside exact recorded accessibility changes',()=>{
  const source=readFileSync('stem_lab/stem_tool_weldlab.js','utf8'),restored=stripWeldlabCoverageFixes(source);
  expect(stripWeldlabCoverageFixes(restored)).toBe(restored);
  expect(createHash('sha256').update(Buffer.from(restored.replace(/\n/g,'\r\n'))).digest('hex')).toBe('93f8f62eaa5cfbaa15d2cac458623116348e81089d95539e2caf086da81e6061');
  expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_weldlab.js')).toEqual(Buffer.from(source));
 });
});
