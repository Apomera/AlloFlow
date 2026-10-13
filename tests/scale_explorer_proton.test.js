import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

// The exponential density is explicitly a teaching approximation. These tests
// validate its normalization, calibration, and sampling; they do not validate a
// measured three-dimensional proton density. NIST CODATA 2022 gives the proton
// rms charge radius as 0.84075 fm: https://physics.nist.gov/cgi-bin/cuu/Value?rp
const source=fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const start=source.indexOf('  var PROTON_REFERENCE_FM='),end=source.indexOf('  var VIRGO_CATALOG=',start);
if(start<0||end<start)throw new Error('Proton study helpers missing');
const api=vm.runInNewContext(source.slice(start,end)+'\n({PROTON_REFERENCE_FM,PROTON_CHARGE_RADIUS_FM,PROTON_PROFILE_A,PROTON_PROFILE_CUTOFF,PROTON_VALENCE,PROTON_SEA,protonDensity,protonEnclosed,protonSamplePoint});');
const radiusFm=.84075,referenceFm=1.68,a=radiusFm/referenceFm/Math.sqrt(12),cutoff=1.35;
function integrate(f,lo,hi,n=4096){let sum=f(lo)+f(hi),h=(hi-lo)/n;for(let i=1;i<n;i++)sum+=f(lo+i*h)*(i%2?4:2);return sum*h/3;}
const radialPdf=r=>4*Math.PI*r*r*api.protonDensity(r);
function factorial(n){let product=1;for(let i=2;i<=n;i++)product*=i;return product;}
// Incomplete gamma moments calculated independently from the sampler.
function gammaFraction(order,t){let term=1,sum=1;for(let i=1;i<order;i++){term*=t/i;sum+=term;}return 1-Math.exp(-t)*sum;}
function truncatedMoment(order){return a**order*factorial(order+2)/2*gammaFraction(order+3,cutoff/a)/gammaFraction(3,cutoff/a);}
function seededRandom(seed){return ()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}

describe('Proton charge-radius teaching study',()=>{
 it('normalizes the smooth radial profile over three-dimensional volume',()=>{
  expect(api.PROTON_PROFILE_A).toBeCloseTo(a,14);
  expect(api.protonDensity(0)).toBeGreaterThan(0);
  expect(integrate(radialPdf,0,10)).toBeCloseTo(1,7);
  for(let i=1;i<=100;i++){
   const r=i/50;expect(Number.isFinite(api.protonDensity(r))).toBe(true);
   expect(api.protonDensity(r)).toBeGreaterThan(0);
   expect(api.protonDensity(r)).toBeLessThan(api.protonDensity(r-.02));
  }
 });
 it('reproduces the measured rms charge radius without treating it as a hard edge',()=>{
  const secondMoment=integrate(r=>r*r*radialPdf(r),0,10);
  expect(secondMoment).toBeCloseTo(12*a*a,8);
  expect(Math.sqrt(secondMoment)*referenceFm).toBeCloseTo(radiusFm,7);
  expect(api.PROTON_CHARGE_RADIUS_FM).toBe(radiusFm);
  // A diffuse distribution has charge outside the rms radius.
  const enclosed=integrate(radialPdf,0,radiusFm/referenceFm);
  expect(enclosed).toBeGreaterThan(.6);expect(enclosed).toBeLessThan(.7);
  expect(api.protonDensity(radiusFm/referenceFm)).toBeGreaterThan(0);
 });
 it('keeps enclosed charge finite and monotonic with the correct radial derivative',()=>{
  expect(api.protonEnclosed(0)).toBe(0);expect(api.protonEnclosed(-1)).toBe(0);
  expect(api.protonEnclosed(10)).toBeCloseTo(1,12);
  let previous=0;
  for(let i=1;i<=256;i++){
   const r=i*cutoff/256,value=api.protonEnclosed(r);
   expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(previous);
   expect(value).toBeLessThanOrEqual(1);previous=value;
  }
  for(const r of [.02,.08,.2,.4,.7,1,cutoff]){
   const h=1e-6,derivative=(api.protonEnclosed(r+h)-api.protonEnclosed(r-h))/(2*h);
   expect(derivative).toBeCloseTo(radialPdf(r),7);
   expect(api.protonEnclosed(r)).toBeCloseTo(integrate(radialPdf,0,r),8);
  }
 });
 it('samples the volume-weighted radial distribution with isotropic directions',()=>{
  expect(api.PROTON_PROFILE_CUTOFF).toBe(cutoff);
  const random=seededRandom(84075168),n=60000,edges=[0,.1,.2,.35,.5,.8,cutoff],counts=Array(6).fill(0),mean=[0,0,0],directionMean=[0,0,0],directionSquared=[0,0,0],cross=[0,0,0];
  let rSum=0,rSquaredSum=0;
  for(let i=0;i<n;i++){
   const p=Array.from(api.protonSamplePoint(random)),r=Math.hypot(...p);
   if(p.length!==3||!p.every(Number.isFinite)||r<=0||r>cutoff)throw new Error('Invalid sampled charge position');
   rSum+=r;rSquaredSum+=r*r;
   counts[edges.findIndex((hi,index)=>index>0&&r<=hi)-1]++;
   for(let axis=0;axis<3;axis++){mean[axis]+=p[axis];directionMean[axis]+=p[axis]/r;directionSquared[axis]+=(p[axis]/r)**2;cross[axis]+=p[axis]*p[(axis+1)%3];}
  }
  expect(rSum/n).toBeCloseTo(truncatedMoment(1),2);
  expect(Math.sqrt(rSquaredSum/n)).toBeCloseTo(Math.sqrt(truncatedMoment(2)),2);
  const retained=gammaFraction(3,cutoff/a);
  for(let i=0;i<counts.length;i++)expect(Math.abs(counts[i]/n-integrate(radialPdf,edges[i],edges[i+1],512)/retained)).toBeLessThan(.007);
  // Four standard errors from the independently calculated moments: strict
  // enough to detect biased directions without mistaking sampling noise for one.
  for(let axis=0;axis<3;axis++){
   expect(Math.abs(mean[axis]/n)).toBeLessThan(4*Math.sqrt(truncatedMoment(2)/(3*n)));
   expect(Math.abs(directionMean[axis]/n)).toBeLessThan(4/Math.sqrt(3*n));
   expect(Math.abs(directionSquared[axis]/n-1/3)).toBeLessThan(4*Math.sqrt(4/(45*n)));
   expect(Math.abs(cross[axis]/n)).toBeLessThan(4*Math.sqrt(truncatedMoment(4)/(15*n)));
  }
 });
 it('shows the uud valence content with total electric charge +1',()=>{
  const valence=Array.from(api.PROTON_VALENCE);
  expect(valence.map(q=>q.flavor).sort()).toEqual(['d','u','u']);
  expect(valence.map(q=>q.chargeThirds).sort()).toEqual([-1,2,2]);
  expect(valence.reduce((charge,q)=>charge+q.chargeThirds,0)).toBe(3);
  for(const q of valence){expect(q.at).toHaveLength(3);expect(Array.from(q.at).every(Number.isFinite)).toBe(true);expect(Math.hypot(...q.at)).toBeLessThan(.5);}
 });
 it('uses neutral quark-antiquark sea pairs and finite schematic positions',()=>{
  const sea=Array.from(api.PROTON_SEA),charges={u:2,d:-1,s:-1};
  expect(sea.map(q=>q.flavor).sort()).toEqual(['d','s','u']);
  let total=0;
  for(const q of sea){
   expect(q.chargeThirds).toBe(charges[q.flavor]);
   const antiparticleCharge=-charges[q.flavor];total+=q.chargeThirds+antiparticleCharge;
   expect(q.chargeThirds+antiparticleCharge).toBe(0);
   for(const position of [q.at,q.partner]){expect(position).toHaveLength(3);expect(Array.from(position).every(Number.isFinite)).toBe(true);expect(Math.hypot(...position)).toBeLessThan(.5);}
   expect(Math.hypot(...q.at.map((v,i)=>v-q.partner[i]))).toBeGreaterThan(0);
  }
  expect(total).toBe(0);
 });
 it('preserves the physical reference span without equating it to a proton surface',()=>{
  expect(api.PROTON_REFERENCE_FM).toBe(referenceFm);
  const entry=source.match(/id: 'proton',[^\n]+/);expect(entry).not.toBeNull();
  expect(entry[0]).toContain("size: 1.68e-15, dim: 'reference span'");
  expect(cutoff*referenceFm).toBeGreaterThan(radiusFm);
 });
});
