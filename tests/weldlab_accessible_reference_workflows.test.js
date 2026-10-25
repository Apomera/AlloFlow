import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, button } from './helpers/weldlab_interaction_mount.js';
import { stripWeldlabWorkflowFixes } from './helpers/weldlab_accessible_workflows_restore.js';

beforeEach(freshTool);
afterEach(unmountState);
const query=selector=>node().querySelector(selector);
const pin={V:22,A:180,TS:12,P:'mig',M:'steel',TH:.25,run:[]};

describe('Named keyboard access to reference tables',()=>{
 it.each([
  ['heat-log',{view:'heatInput'}],
  ['bead-compare',{view:'beadLab',arc_pin:pin}],
  ['process-matrix',{view:'processCompare'}],
  ['pathway-earnings',{view:'careerPaths',cp_view:'earnings',car2_pred:{a25:'apprentice',a35:'college',shown:true}}],
  ['inspection-report',{view:'inspection',insp_sect:'bench',insp2_bench:{uc1:{pick:'accept',recs:[6.25]}}}],
  ['roadmap-summary',{view:'maineEcosystem',me_mode:'roadmap',me_road_path:'ua_apprentice',car2_road:{d1:'stay',d2:'cwi'}}],
  ['eye-shades',{view:'safetyHealth',sh_sect:'eyes'}],
 ])('%s retains its table semantics and exposes a named Tab stop',async(name,state)=>{
  const app=await mountState(state);
  if(name==='heat-log')await click(button('📋 Log this setting'));
  const region=query('[data-weld-reference-scroll="'+name+'"]');
  expect(region).toBeTruthy();expect(region.tabIndex).toBe(0);expect(region.getAttribute('role')).toBe('region');
  const label=query('#'+region.getAttribute('aria-labelledby'));
  expect(label).toBeTruthy();expect(label.textContent.trim().length).toBeGreaterThan(5);
  expect(region.querySelector('table thead th[scope="col"]')).toBeTruthy();
  expect(region.querySelector('table tbody tr')).toBeTruthy();
  const saved=JSON.stringify(app.latest()),writes=app.writes.length;
  region.focus();expect(document.activeElement).toBe(region);
  expect(JSON.stringify(app.latest())).toBe(saved);expect(app.writes).toHaveLength(writes);
 });
});

describe('Focus after removing comparison or evidence controls',()=>{
 it('returns Clear pin focus to the retained bead pin action and preserves live settings and recorded run',async()=>{
  const app=await mountState({view:'beadLab',arc_pin:pin,bl_V:26,bl_A:190,bl_TS:9,arc_run:[10,11,12],car2_reflect:'Keep this note'});
  const clear=button('Clear pin');clear.focus();await click(clear);
  expect(clear.isConnected).toBe(false);expect(document.activeElement).toBe(query('[data-weld-bead-pin]'));
  expect(document.activeElement.textContent).toBe('📌 Pin this bead');
  expect(app.latest()).toMatchObject({arc_pin:null,bl_V:26,bl_A:190,bl_TS:9,arc_run:[10,11,12],car2_reflect:'Keep this note'});
 });
 it('returns Clear evidence focus to the persistent marking control without grading the job',async()=>{
  const app=await mountState({view:'robotic',rob_sect:'sorter',tech2_rob_sort:{1:'manual'},rob4_job:0});
  const mark=query('[data-rob-job-note]');await click(mark);expect(mark.getAttribute('aria-pressed')).toBe('true');
  const saved=JSON.stringify(app.latest()),writes=app.writes.length,clear=query('[data-rob-job-clear-notes]');
  clear.focus();await click(clear);
  expect(clear.disabled).toBe(true);expect(document.activeElement).toBe(mark);expect(mark.getAttribute('aria-pressed')).toBe('false');
  expect(JSON.stringify(app.latest())).toBe(saved);expect(app.writes).toHaveLength(writes);
 });
 it('reverses only recorded accessibility edits and preserves source mirrors',()=>{
  const source=readFileSync('stem_lab/stem_tool_weldlab.js','utf8'),restored=stripWeldlabWorkflowFixes(source);
  expect(stripWeldlabWorkflowFixes(restored)).toBe(restored);
  expect(createHash('sha256').update(Buffer.from(restored.replace(/\n/g,'\r\n'))).digest('hex')).toBe('7266d431321c35a2772696b634203fe635e17fe449619ea31891acd6d4a09a58');
  expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_weldlab.js')).toEqual(Buffer.from(source));
 });
});
