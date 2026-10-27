import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change, button } from './helpers/weldlab_interaction_mount.js';
import { stripWeldlabPracticeFixes } from './helpers/weldlab_accessible_practice_restore.js';

beforeEach(freshTool);
afterEach(unmountState);
const causeGroup = () => node().querySelector('[role="radiogroup"][aria-label="Pick the root cause"]');
async function submitDiagnosis() {
  await click(causeGroup().querySelector('[role="radio"]'));
  await click(button('Submit diagnosis'));
}

describe('Accessible Diagnose practice transitions', () => {
  it('preserves all earlier source exactly outside the recorded accessibility changes', () => {
    const source=readFileSync('stem_lab/stem_tool_weldlab.js','utf8');
    const restored=stripWeldlabPracticeFixes(source);
    expect(stripWeldlabPracticeFixes(restored)).toBe(restored);
    const bytes=Buffer.from(restored.replace(/\n/g,'\r\n'),'utf8');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('9f283a107274dd66498dbf31117c9128f8187eca44aa95d035ecb2077190b3e8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_weldlab.js').equals(Buffer.from(source)), 'public mirror is byte-identical').toBe(true);
  });
  it('focuses the new prompt on Start and Next, then leaves repair exploration focus alone', async () => {
    const app = await mountState({view:'defectDiagnose',dd2Idx:-1});
    const start = [...node().querySelectorAll('button')].find(b=>b.textContent.startsWith('🔬 Start:'));
    start.focus(); await click(start);
    expect(document.activeElement).toBe(node().querySelector('[data-weld-practice-prompt="diagnose"]'));
    expect(document.activeElement.getAttribute('aria-describedby')).toBe('dh2-dd-prompt');
    expect(node().querySelector('#dh2-dd-prompt').textContent.length).toBeGreaterThan(50);
    await submitDiagnosis();
    expect(document.activeElement.getAttribute('aria-labelledby')).toBe('dh2-dd-feedback-title');
    const next = button('➡️ Next defect'); next.focus(); const previous=app.latest().dd2Idx;
    await click(next);
    expect(app.latest().dd2Idx).not.toBe(previous);
    expect(document.activeElement).toBe(node().querySelector('[data-weld-practice-prompt="diagnose"]'));
    const radio=causeGroup().querySelector('[role="radio"]');radio.focus();await click(radio);
    expect(document.activeElement).toBe(radio);
  });
  it('returns Restart focus to the introduction and resets only authored attempt values', async () => {
    const app=await mountState({view:'defectDiagnose',dd2Idx:0,dd2Shown:Array.from({length:11},(_,i)=>i),dd2Ans:true,dd2Pick:'contamination',dd2Score:9,dd2Rounds:10,dd2Best:8});
    const restart=button('🔄 Restart');restart.focus();await click(restart);
    expect(document.activeElement).toBe(node().querySelector('[data-weld-practice-intro="diagnose"]'));
    expect(app.latest().dd2Idx).toBe(-1);expect(app.latest().dd2Score).toBe(0);expect(app.latest().dd2Best).toBe(8);
  });
  it.each([false,true])('does not take focus when opening a saved answered attempt (contrast %s)',async contrast=>{
    const outside=document.createElement('button');document.body.append(outside);outside.focus();
    try{
      await mountState({view:'defectDiagnose',dd2Idx:1,dd2Shown:[1],dd2Ans:true,dd2Pick:'heatHigh',dd2Score:1,dd2Rounds:1},contrast);
      expect(document.activeElement).toBe(outside);
      const slider=node().querySelector('input[type="range"]');slider.focus();await change(slider,String(Number(slider.value)+Number(slider.step)));
      expect(document.activeElement).toBe(slider);
    }finally{outside.remove()}
  });
});
