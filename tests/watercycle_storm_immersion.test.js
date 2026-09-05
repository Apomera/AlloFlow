import {describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
function kernel(){resetStemLab();loadTool('stem_lab/stem_tool_watercycle.js','waterCycle');return window.WaterCyclePrecipitationKernel;}
describe('Storm immersion weather response',()=>{
 it('moves toward selected conditions without a jump or overshoot',()=>{
  const k=kernel(),start=k.compute(k.presets.gentleRain).config,target=k.compute({...k.presets.hailstorm,stormTrack:2,transitionSeconds:6}).config;
  const next=k.advanceWeather(start,target,0.1,false);
  for(const key of ['wind','moisture','updraft','cloudDepth','stormTrack']){
   expect(next[key]).toBeGreaterThanOrEqual(Math.min(start[key],target[key]));
   expect(next[key]).toBeLessThanOrEqual(Math.max(start[key],target[key]));
   expect(next[key]).not.toBe(target[key]);
  }
  let current=start;for(let i=0;i<200;i++)current=k.advanceWeather(current,target,0.1,false);
  expect(current.wind).toBeCloseTo(target.wind,1);expect(current.stormTrack).toBeCloseTo(2,1);
 });
 it('has the same response at different frame rates',()=>{
  const k=kernel(),start=k.compute(k.presets.gentleRain).config,target=k.compute(k.presets.hailstorm).config;
  let a=start,b=start;for(let i=0;i<10;i++)a=k.advanceWeather(a,target,0.1,false);for(let i=0;i<20;i++)b=k.advanceWeather(b,target,0.05,false);
  expect(a.wind).toBeCloseTo(b.wind,8);expect(a.tempC).toBeCloseTo(b.tempC,8);
 });
 it('applies reduced-motion changes immediately and retains discrete choices',()=>{
  const k=kernel(),start=k.compute().config,target=k.compute({wind:30,stormTrack:-2,environment:'beach',cameraFocus:'immersive'}).config;
  expect(k.advanceWeather(start,target,0.1,true)).toEqual(target);
 });
 it('slows before reversing wind direction instead of flipping instantly',()=>{
  const k=kernel(),start=k.compute({wind:20,windDirection:'east'}).config,target=k.compute({wind:20,windDirection:'west'}).config;
  const first=k.advanceWeather(start,target,0.1,false);
  expect(first.windDirection).toBe('east');expect(first.wind).toBeLessThan(20);expect(first.wind).toBeGreaterThan(0);
  let current=first;for(let i=0;i<160;i++)current=k.advanceWeather(current,target,0.1,false);
  expect(current.windDirection).toBe('west');expect(current.wind).toBeCloseTo(20,1);
 });
 it('bounds saved navigation and transition settings',()=>{
  const k=kernel(),cfg=k.compute({stormTrack:999,transitionSeconds:-4,environment:'invalid',cameraFocus:'immersive'}).config;
  expect(cfg.stormTrack).toBe(2.5);expect(cfg.transitionSeconds).toBe(1);expect(cfg.environment).toBe('forest');expect(cfg.cameraFocus).toBe('immersive');
 });
 it('renders recovery, touch navigation, and track controls in the 3D view',()=>{
  kernel();const html=renderTool('waterCycle',{waterCycle:{wcMode:'precipHunt',precipHunt:{viewMode:'3d',cameraFocus:'immersive'}}});
  for(const content of ['Inside the storm','Retry 3D','Forest clearing','Suburban street','wcStormFieldTrack','Look left','Full-screen storm','tabindex="0"'])expect(html).toContain(content);
 });
});
