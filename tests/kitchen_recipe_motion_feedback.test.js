import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),F=require('../stem_lab/kitchen_studio/recipe_lab_motion_feedback.js');
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const guide=(tool,phase,extra={})=>({tool,title:'Practice '+tool,phase,instruction:'Follow the movement.',detail:'Preview only',progress:.5,invalid:false,...extra});
describe('Motion feedback observes explicitly reported outcomes',()=>{
  it.each(['completed','unfinished','stopped','kept'])('preserves the explicit %s outcome and exact evidence',outcome=>{
    const g=freeze(guide('mince','up')),o=freeze({outcome,evidence:'No knife pass recorded.'}),before=JSON.stringify({g,o}),result=F.finish(g,o);
    expect(result.outcome).toBe(outcome);expect(result.instruction).toBe(o.evidence);expect(result.phase).toBe('up');expect(JSON.stringify({g,o})).toBe(before);
    expect(result).toEqual(expect.objectContaining({tool:'mince',title:'Practice mince',label:expect.any(String),detail:expect.any(String)}));
  });
  it('does not promote a release preview or 100 percent progress into a recorded action',()=>{
    const g=guide('serve','release',{progress:1});const result=F.finish(g,{outcome:'unfinished',evidence:'No spoonful transferred.'});
    expect(result.outcome).toBe('unfinished');expect(result.instruction).toBe('No spoonful transferred.');expect(result.detail).toContain('release over the marked destination');expect(result.detail).not.toMatch(/completed work is kept/i);
  });
  it('trusts a completed report independently of guide phase and progress',()=>{
    const result=F.finish(guide('mince','down',{progress:0,invalid:true}),{outcome:'completed',evidence:'One knife pass recorded.'});
    expect(result.outcome).toBe('completed');expect(result.instruction).toBe('One knife pass recorded.');expect(result.detail).toContain('both the downward cut and lifting back');expect(result.detail).not.toContain('Next attempt');
  });
  it('does not use stale preview quantities as evidence or a completed lesson',()=>{
    const result=F.finish(guide('ladle','release',{detail:'50 mL in the ladle · preview only · 0 mL saved'}),{outcome:'completed',evidence:'50 mL saved in the jug.'});
    expect(result.instruction).toBe('50 mL saved in the jug.');expect(result.detail).not.toMatch(/preview|0 mL saved/);expect(result.detail).toContain('before draining');
  });
  it('keeps exact preserved work in caller evidence instead of estimating from progress',()=>{
    const result=F.finish(guide('pour','pour',{progress:.99,detail:'100 mL preview'}),{outcome:'kept',evidence:'30 mL already poured remains in the pan.'});
    expect(result.instruction).toBe('30 mL already poured remains in the pan.');expect(result.detail).toContain('Level the jug');expect(JSON.stringify(result)).not.toContain('100 mL');
  });
  it.each(['mince','sample','probe'])('explains the missing upward motion for %s',tool=>{
    const result=F.finish(guide(tool,'up'),{outcome:'unfinished',evidence:'No action recorded.'});expect(result.detail).toMatch(/^Next attempt: .*down.*then lift.*back.*before releasing/);
  });
  it('distinguishes gathering from the missing inward fold',()=>{
    const a=F.finish(guide('stir','sweep'),{outcome:'unfinished',evidence:'No mix recorded.'}),b=F.finish(guide('stir','fold'),{outcome:'unfinished',evidence:'No mix recorded.'});
    expect(a.detail).toContain('full circle');expect(b.detail).toContain('Keep holding after the circle and draw inward');expect(a.detail).not.toBe(b.detail);
  });
  it.each(['handoff','fresh-water','dry-pasta'])('separates carry, level and partial-tip hints for %s',tool=>{
    const details=['carry','level','tip'].map(phase=>F.finish(guide(tool,phase),{outcome:'unfinished',evidence:'Nothing transferred.'}).detail);
    expect(details[0]).toMatch(/Carry.*before tipping/);expect(details[1]).toMatch(/Tip straight down/);expect(details[2]).toContain('Continue tipping');expect(new Set(details).size).toBe(3);
  });
  it.each(['mince','sample','probe','crush'])('gives invalid straight-path constraints for %s',tool=>{
    const result=F.finish(guide(tool,'retry',{invalid:true}),{outcome:'unfinished',evidence:'No action recorded.'});expect(result.detail).toContain('avoid sideways motion or reversing');
  });
  it('lets an invalid constraint override a ready-looking phase',()=>{
    const result=F.finish(guide('sauce-check','release',{invalid:true,progress:1}),{outcome:'unfinished',evidence:'No check recorded.'});expect(result.detail).toContain('steady path from left to right');expect(result.detail).not.toContain('Repeat the complete movement');
  });
  it.each(['serve','lid','pan-choice','handoff'])('cautions about the actual release destination for %s',tool=>{
    const result=F.finish(guide(tool,'release'),{outcome:'stopped',evidence:'No action recorded.'});expect(result.detail).toContain('release over the marked destination');expect(result.outcome).toBe('stopped');
  });
  it('does not credit previewed handwashing when a ready practice was cancelled',()=>{
    const result=F.finish(guide('wash','release',{progress:1}),{outcome:'stopped',evidence:'No handwashing recorded.'});expect(result.detail).toContain('Repeat the complete');expect(result.detail).toContain('previewed practice is not recorded');expect(JSON.stringify(result)).not.toMatch(/work is kept|practice saved|practice resumed/i);
  });
  it('keeps a stopped scrub hint specific without claiming its active seconds were saved',()=>{
    const result=F.finish(guide('wash','scrub',{detail:'12 of 20 active practice seconds'}),{outcome:'stopped',evidence:'No handwashing recorded.'});expect(result.detail).toContain('all five poses');expect(result.detail).not.toContain('12');
  });
  it('preserves a caller-provided release reason alongside the next motion',()=>{
    const result=F.finish(guide('serve','tip'),{outcome:'unfinished',evidence:'Spoonful returned.',reason:'The pointer left the plate before release.'});expect(result.detail).toContain('Tip straight down');expect(result.detail).toContain('The pointer left the plate before release.');
  });
  it('provides conservative guidance for an unknown tool without reusing a release promise',()=>{
    const result=F.finish(guide('future-tool','future-phase',{instruction:'Release to record the action.'}),{outcome:'unfinished',evidence:'No action recorded.'});expect(result.tool).toBe('future-tool');expect(result.detail).toContain('complete the movement before releasing');expect(result.detail).not.toContain('Release to record');
  });
  it('reuses a specific non-release instruction for an unknown tool',()=>{
    const result=F.finish(guide('future-tool','carry',{instruction:'Carry the container to the blue station.'}),{outcome:'stopped',evidence:'No action recorded.'});expect(result.detail).toBe('Next attempt: Carry the container to the blue station.');
  });
  it('returns a safe null-guide fallback and does not infer an outcome',()=>{
    const result=F.finish(null,{outcome:'stopped',evidence:'No action recorded.'});expect(result).toEqual({tool:'unknown',title:'Kitchen movement',label:'Movement stopped',outcome:'stopped',instruction:'No action recorded.',detail:'Next attempt: Start again on the tool’s working object and complete the movement before releasing.',phase:'unknown'});
  });
  it('falls back conservatively for missing options and malformed values',()=>{
    const result=F.finish({tool:null,title:2,phase:NaN,progress:1},null);expect(result.outcome).toBe('unfinished');expect(result.instruction).toBe('No action result was provided.');expect(result.tool).toBe('unknown');
    expect(F.finish(guide('mince','release'),{outcome:'recorded',evidence:'No result.'}).outcome).toBe('unfinished');
  });
  it('does not accept prototype keys as outcomes',()=>{
    expect(F.finish(null,{outcome:'toString',evidence:'No action recorded.'}).outcome).toBe('unfinished');
  });
  it('treats prototype keys in a tool or phase as unknown descriptions',()=>{
    const result=F.finish(guide('toString','constructor'),{outcome:'completed',evidence:'Result provided.'});expect(typeof result.detail).toBe('string');expect(result.detail).toBe('Use the result of this movement to decide your next step.');
    expect(F.finish(guide('mince','toString'),{outcome:'unfinished',evidence:'No action recorded.'}).detail).not.toContain('function');
  });
  it('returns a fresh result on each call without retaining attempted practice',()=>{
    const g=freeze(guide('mince','up')),o=freeze({outcome:'stopped',evidence:'No knife pass recorded.'}),a=F.finish(g,o),b=F.finish(g,o);a.detail='changed';expect(b.detail).toContain('then lift back');expect(a).not.toBe(b);
  });
});
