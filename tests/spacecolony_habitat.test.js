import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_spacecolony.js','utf8');
const start=source.indexOf('function projectColonyHabitat('),end=source.indexOf('window.StemLab.registerTool',start);
const project=new Function(source.slice(start,end)+';return projectColonyHabitat;')();
describe('habitat construction forecast',()=>{
 it('charges construction once and includes one sol of production',()=>{
  const reserves={food:40,water:30,energy:30,materials:20,science:10};
  const forecast=project(reserves,{food:-6,water:-3},{materials:15,energy:5},{food:3});
  expect(forecast.current.food).toBe(34);expect(forecast.next.food).toBe(37);
  expect(forecast.next.materials).toBe(5);expect(forecast.next.energy).toBe(25);
  expect(forecast.affordable).toBe(true);expect(reserves.materials).toBe(20);
 });
 it('exposes an unaffordable design without clamping away its shortfall',()=>{
  const f=project({materials:4,energy:2},{},{materials:15,energy:5},{});
  expect(f.affordable).toBe(false);expect(f.next.materials).toBe(-11);expect(f.next.energy).toBe(-3);
 });
 it('does not charge or add production again for an installed system',()=>{
  const f=project({energy:30},{energy:3},{},{});expect(f.current.energy).toBe(33);expect(f.next.energy).toBe(33);
 });
});
