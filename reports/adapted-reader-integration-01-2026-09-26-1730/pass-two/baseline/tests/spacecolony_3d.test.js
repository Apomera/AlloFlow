import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_spacecolony.js','utf8');
const a=source.indexOf('function colonyVisualSnapshot('),b=source.indexOf('function ColonyTerraformScene',a);
const snapshot=new Function(source.slice(a,b)+';return colonyVisualSnapshot;')();
describe('colony 3D campaign snapshot',()=>{
 it('separates installed hardware from working hardware',()=>{const s=snapshot(4,25,['solar','fusion','solar'],{fusion:0});expect(s.installed).toEqual(['fusion','solar']);expect(s.operating).toEqual(['solar']);});
 it('keeps observations immutable when the campaign changes',()=>{const buildings=['atmo'];const eff={atmo:100};const before=snapshot(3,20,buildings,eff);buildings.push('shield');eff.atmo=0;expect(before.installed).toEqual(['atmo']);expect(before.operating).toEqual(['atmo']);});
 it('bounds scenario progress and handles incomplete saves',()=>{expect(snapshot(-3,150,null).progress).toBe(100);expect(snapshot(-3,-10,[]).turn).toBe(0);expect(snapshot(Infinity,NaN,[]).progress).toBe(0);expect(snapshot(3.8,12,[null,'solar'],{}).installed).toEqual(['solar']);});
});
