import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');
const start=source.indexOf('var scannerCooldown = 0;');
const end=source.indexOf('var previousScanSnapshot = null;',start);
function scanner(deployed=true) {
 let now=100;
 const api=new Function('performance','_descentPhase',source.slice(start,end)+';return {begin:beginDroneScan,refresh:refreshScannerCooldown,cooldown:()=>scannerCooldown,deploy:()=>{_descentPhase=1;}};')({now:()=>now},deployed?1:0);
 return {...api,at:(value)=>{now=value;}};
}
describe('survey scanner elapsed-time recharge',()=>{
 it('recharges after five seconds even without animation frames',()=>{const s=scanner();expect(s.begin()).toBe(true);s.at(5099);expect(s.begin()).toBe(false);s.at(5100);expect(s.begin()).toBe(true);});
 it('does not extend the recharge deadline when input repeats',()=>{const s=scanner();s.begin();s.at(1100);expect(s.begin()).toBe(false);s.at(3100);expect(s.begin()).toBe(false);s.at(5100);expect(s.begin()).toBe(true);});
 it('waits for deployment without consuming a charge',()=>{const s=scanner(false);expect(s.begin()).toBe(false);expect(s.cooldown()).toBe(0);s.deploy();expect(s.begin()).toBe(true);expect(s.cooldown()).toBe(300);});
});
