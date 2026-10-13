import {describe,it,expect} from 'vitest';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),start=source.indexOf('  var HELIO_CROSSINGS='),end=source.indexOf('  function oortOrbitPoint(',start);if(start<0||end<start)throw new Error('Heliosphere helper missing');
const api=vm.runInNewContext(source.slice(start,end)+'\n({HELIO_CROSSINGS,helioCrossingPoint});'),au=149597870700/3.64e13;
describe('Historical heliosphere crossings',()=>{
 it('places both Voyager crossings at their measured solar distances',()=>{for(const [i,values]of [[0,[94,121.6]],[1,[84,119]]]){expect(Math.hypot(...api.helioCrossingPoint(i,'shock'))/au).toBeCloseTo(values[0],10);expect(Math.hypot(...api.helioCrossingPoint(i,'pause'))/au).toBeCloseTo(values[1],10);}});
 it('keeps each historical route radial with the shock inside its heliopause',()=>{for(let i=0;i<2;i++){const a=api.helioCrossingPoint(i,'shock'),b=api.helioCrossingPoint(i,'pause');expect(Math.hypot(...a)).toBeLessThan(Math.hypot(...b));expect(Math.hypot(...b)).toBeLessThan(.5);for(let k=0;k<3;k++){expect(a[k]/b[k]).toBeCloseTo(api.HELIO_CROSSINGS[i].shock/api.HELIO_CROSSINGS[i].pause,12);expect(Number.isFinite(a[k])).toBe(true);}}});
 it('retains crossing years rather than presenting current spacecraft positions',()=>{expect(Array.from(api.HELIO_CROSSINGS,v=>[v.shockYear,v.pauseYear])).toEqual([[2004,2012],[2007,2018]]);expect(api.helioCrossingPoint(0,'pause')[1]).toBeGreaterThan(0);expect(api.helioCrossingPoint(1,'pause')[1]).toBeLessThan(0);});
});
