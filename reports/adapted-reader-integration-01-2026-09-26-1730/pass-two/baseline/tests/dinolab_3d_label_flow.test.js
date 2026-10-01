import {describe,it,expect} from 'vitest';
import {internals} from './helpers/dino_lab_harness.js';
const layout=internals().dinoBodyLabelLayout;
function crosses(a,b){
 const dx=a.lineX-a.anchorX,dy=a.lineY-a.anchorY,ex=b.lineX-b.anchorX,ey=b.lineY-b.anchorY;
 const den=dx*ey-dy*ex;if(Math.abs(den)<1e-8)return false;
 const qx=b.anchorX-a.anchorX,qy=b.anchorY-a.anchorY,t=(qx*ey-qy*ex)/den,u=(qx*dy-qy*dx)/den;
 return t>1e-3&&t<1-1e-3&&u>1e-3&&u<1-1e-3;
}
function checkClear(items){
 for(const a of items)for(const b of items)if(a!==b){
  expect(crosses(a,b)).toBe(false);
  let blocked=false;for(let t=.01;t<1;t+=.01){const x=a.anchorX+(a.lineX-a.anchorX)*t,y=a.anchorY+(a.lineY-a.anchorY)*t;if(x>b.x&&x<b.x+b.width&&y>b.y&&y<b.y+b.height){blocked=true;break;}}expect(blocked).toBe(false);
 }
}
describe('Dino Lab moving callout layout',()=>{
 it('retains valid anchor-relative placement throughout small movements',()=>{
  const original=[{id:'head',x:180,y:190},{id:'trunk',x:400,y:240},{id:'tail',x:660,y:230}];
  let prior=layout(original,900,520,64,88,'trunk');const frozen=JSON.stringify(prior),offsets=Object.fromEntries(prior.map(p=>[p.id,[p.x-p.anchorX,p.y-p.anchorY]]));
  for(let frame=1;frame<=60;frame++){
   const points=original.map((p,i)=>({...p,x:p.x+Math.sin(frame*.1+i)*2,y:p.y+Math.cos(frame*.08+i)*2}));
   const next=layout(points,900,520,64,88,'trunk',prior);expect(next.map(p=>p.id)).toEqual(prior.map(p=>p.id));
   for(const p of next){expect(p.x-p.anchorX).toBeCloseTo(offsets[p.id][0],6);expect(p.y-p.anchorY).toBeCloseTo(offsets[p.id][1],6);}checkClear(next);prior=next;
  }
  expect(JSON.stringify(layout(original,900,520,64,88,'trunk'))).toBe(frozen);
 });
 it('uses measured multiline label bounds and does not mutate input or prior layouts',()=>{
  const points=[{id:'a',x:210,y:200,width:166,height:64},{id:'b',x:650,y:260,width:120,height:46}],prior=layout(points,900,520,64,88);
  const before=JSON.stringify({points,prior}),out=layout(points,900,520,64,88,'b',prior);
  expect(out).toHaveLength(2);expect(out[0]).toMatchObject({id:'b',width:120,height:46});expect(out[1]).toMatchObject({id:'a',width:166,height:64});checkClear(out);expect(JSON.stringify({points,prior})).toBe(before);
 });
 it('reroutes a former placement when its leader would cross another leader',()=>{
  const points=[{id:'a',x:200,y:180},{id:'b',x:300,y:180}];
  const prior=[{id:'a',x:320,y:220,width:96,height:28,anchorX:200,anchorY:180},{id:'b',x:100,y:220,width:96,height:28,anchorX:300,anchorY:180}];
  const out=layout(points,700,500,64,88,'',prior);expect(out).toHaveLength(2);checkClear(out);expect(out[1].x).not.toBe(100);
 });
 it('does not place text across an existing leader',()=>{
  const points=[{id:'a',x:100,y:190},{id:'b',x:290,y:320}];
  const prior=[{id:'a',x:400,y:176,width:96,height:28,anchorX:100,anchorY:190},{id:'b',x:245,y:175,width:96,height:28,anchorX:290,anchorY:320}];
  const out=layout(points,700,520,64,88,'',prior);expect(out).toHaveLength(2);checkClear(out);expect(out[1].y).not.toBe(175);
 });
 it('gives a new selection priority over incumbent phone callouts',()=>{
  const points=Array.from({length:7},(_,i)=>({id:String(i),x:55+(i%3)*115,y:130+Math.floor(i/3)*100}));
  const prior=layout(points,390,520,64,132),out=layout(points,390,520,64,132,'6',prior);
  expect(out[0].id).toBe('6');expect(out[0].selected).toBe(true);expect(out.length).toBeLessThanOrEqual(4);checkClear(out);
 });
 it('drops stale offscreen labels and safely handles oversized text',()=>{
  const prior=layout([{id:'tail',x:250,y:200}],600,520,64,88);
  expect(layout([{id:'tail',x:900,y:200}],600,520,64,88,'tail',prior)).toEqual([]);
  expect(layout([{id:'tail',x:150,y:200,width:500,height:600}],320,520,64,88,'tail',prior)).toEqual([]);
 });
 it('keeps labels and leader routes clear across dense moving layouts',()=>{
  let prior=[];
  for(let frame=0;frame<40;frame++){
   const points=Array.from({length:10},(_,i)=>({id:String(i),x:160+i*48+Math.sin(frame*.12+i)*20,y:180+(i%3)*75+Math.cos(frame*.09+i)*12,width:96+(i%3)*15,height:i%2?46:28}));
   prior=layout(points,900,560,64,88,'8',prior);expect(prior[0].id).toBe('8');expect(prior.length).toBeGreaterThanOrEqual(3);checkClear(prior);
  }
 });
 it('uses the freed lower canvas for a multiline selected label on a narrow phone',()=>{
  const points=[{id:'a',x:55,y:100},{id:'b',x:200,y:100},{id:'c',x:55,y:175},{id:'d',x:200,y:175},{id:'ankle',x:235,y:290,width:144,height:64}];
  const out=layout(points,320,342,64,18,'ankle');expect(out[0]).toMatchObject({id:'ankle',width:144,height:64});expect(out[0].y+out[0].height).toBeLessThanOrEqual(324);checkClear(out);
 });

});
