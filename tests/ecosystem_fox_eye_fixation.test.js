import {beforeEach,describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api,recording;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const config={soil:{enabled:false},enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none',target:'foxes',eventStep:80};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function recorded(){if(!recording){const c=api.normalize(config),pair=api.compare(c);recording={c,pair,frames:api.behaviorTimeline(c,pair.baseline)};}return recording;}
function fixture(){return {active:true,state:'Listening',x:0,z:0,yaw:0,headTurn:.1,rest:0,pounce:0,huntStage:'',prey:'rabbits',preyIndex:2,preyDistance:2,preyCueSnapshot:{id:'rabbits',index:2,x:2*Math.cos(.5),z:-2*Math.sin(.5)},attention:{kind:'prey',id:'rabbits',index:2,x:2*Math.cos(.5),z:-2*Math.sin(.5),bearing:.5,turn:.48},eyeAim:.7};}
function rayZ(surface,x,y){
  let best=-Infinity;const p=surface.positions;
  for(let offset=0;offset<surface.indices.length;offset+=3){const a=surface.indices[offset]*3,b=surface.indices[offset+1]*3,c=surface.indices[offset+2]*3,den=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);if(Math.abs(den)<1e-14)continue;
    const wa=((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/den,wb=((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/den,wc=1-wa-wb;if(Math.min(wa,wb,wc)<-1e-10)continue;best=Math.max(best,wa*p[a+2]+wb*p[b+2]+wc*p[c+2]);
  }return best;
}

describe('live prey fox eye fixation',()=>{
  it('uses the exact existing live prey attention after the recorded head turn without changing its inputs',()=>{
    const p=fixture(),before=JSON.stringify(p),target=api.foxEyeTarget(p);expect(target).toMatchObject({id:'rabbits',index:2,x:p.attention.x,z:p.attention.z});expect(target.residual).toBeCloseTo(.4,14);expect(target.amount).toBeCloseTo(Math.sin(.4)/Math.sin(.8)*Math.cos(.4),14);expect(JSON.stringify(p)).toBe(before);
    target.x=999;expect(api.foxEyeTarget(p).x).toBe(p.attention.x);expect(api.foxEyeTarget({...p,attention:{...p.attention,bearing:Math.PI-.01},preyCueSnapshot:{...p.preyCueSnapshot}})).toBeNull();
  });
  it('cancels for absence, rest, flight, recovery, search, release and malformed or mismatched cue identity/coordinates',()=>{
    for(const patch of [{active:false},{state:'Resting'},{state:'Searching'},{state:'Pouncing'},{state:'Recovering'},{huntStage:'airborne'},{huntStage:'recover'},{rest:.2},{pounce:.1},{searchCue:{}},{breakoffCue:{}},{prey:null},{preyIndex:1},{preyDistance:NaN},{rest:NaN},{pounce:NaN},{x:1001},{headTurn:Infinity},{eyeAim:1,attention:null}]){const p={...fixture(),...patch};expect(api.foxEyeTarget(p)).toBeNull();expect(api.foxEyeAim({active:true,eyeAim:1},p)).toBe(0);expect(api.foxEyeFixation(p,1,false).amount).toBe(0);}
    for(const mutate of [p=>p.attention.kind='threat',p=>p.attention.id='plants',p=>p.attention.index=16,p=>p.attention.x+=.001,p=>p.attention.z=NaN,p=>p.attention.bearing=.3,p=>p.attention.turn=.6,p=>p.preyCueSnapshot.index=1,p=>p.preyCueSnapshot.id='voles',p=>p.preyCueSnapshot.x=1001]){const p=fixture();mutate(p);expect(api.foxEyeTarget(p)).toBeNull();}
  });
  it('eases the signed presentation scalar by at most .22 per sample and never tracks through the back of the skull',()=>{
    const p=fixture();let old={active:true,eyeAim:-1};for(let n=0;n<10;n++){const value=api.foxEyeAim(old,p);expect(Math.abs(value-old.eyeAim)).toBeLessThanOrEqual(.220000000000001);expect(Math.abs(value)).toBeLessThanOrEqual(1);old={active:true,eyeAim:value};}expect(old.eyeAim).toBeCloseTo(api.foxEyeTarget(p).amount,14);
    const angle=2.5,behind={...p,headTurn:0,attention:{...p.attention,x:2*Math.cos(angle),z:-2*Math.sin(angle),bearing:angle},preyCueSnapshot:{...p.preyCueSnapshot,x:2*Math.cos(angle),z:-2*Math.sin(angle)}};expect(api.foxEyeTarget(behind).amount).toBe(0);expect(api.foxEyeAim({active:false,eyeAim:1},p)).toBeCloseTo(.22,14);expect(api.foxEyeAim({active:true,eyeAim:NaN},p)).toBeCloseTo(.22,14);
  });
  it('projects iris, pupil and glint along the unchanged dark globe while retaining original layer offsets and mirrored eye-local motion',()=>{
    const p=fixture(),before=JSON.stringify(p),left=api.foxEyeFixation(p,-1,false),right=api.foxEyeFixation(p,1,false),homes={iris:[.005,0,.013],pupil:[.007,.001,.016],glint:[.009,.005,.019]};expect(left.offset).toBeCloseTo(-.7*.0032,14);expect(right.offset).toBeCloseTo(.7*.0032,14);expect(left.cue).toEqual(right.cue);
    const depth=(x,y)=>.007*Math.sqrt(Math.max(0,1-((x-.003)/.021)**2-(y/.013)**2));for(const [side,fix] of [[-1,left],[1,right]])for(const [name,home] of Object.entries(homes)){const q=fix.positions[name];expect(q[0]-home[0]).toBeCloseTo(fix.offset,14);expect(q[1]).toBe(home[1]);expect(side*q[2]-depth(q[0],q[1])).toBeCloseTo(home[2]-depth(home[0],home[1]),14);}
    expect(JSON.stringify(p)).toBe(before);left.positions.iris[0]=999;left.cue.x=999;expect(api.foxEyeFixation(p,-1,false)).not.toEqual(left);expect(api.foxEyeFixation(p,0,false)).toBeNull();
  });
  it('restores every original layer mount for reduced motion, missing starting-pose metadata and invalid cues',()=>{
    const p=fixture(),neutral=api.foxEyeFixation(p,1,true);expect(neutral).toMatchObject({amount:0,offset:0,cue:null,positions:{iris:[.005,0,.013],pupil:[.007,.001,.016],glint:[.009,.005,.019]}});expect(api.foxEyeFixation(null,1,false)).toEqual(neutral);expect(api.foxEyeFixation({...p,active:false},1,false)).toEqual(neutral);expect(api.foxEyeFixation({...p,eyeAim:undefined},1,false).positions).toEqual(neutral.positions);
    expect(api.foxEyeFixation({...p,eyeAim:Infinity},1,false).amount).toBe(0);for(const side of [-1,1])expect(api.foxEyeFixation({...p,eyeAim:999},side,false).offset).toBe(side*.0032);
  });
  it('keeps the complete moving layer footprints inside the open aperture and behind both actual fully closed eyelid surfaces',()=>{
    const p=fixture(),mount=api.eyeMount('foxes'),closed=api.mammalEyelids('foxes',0),co=Math.cos(mount.angle),si=Math.sin(mount.angle),sizes={iris:[.010,.011,.004],pupil:[.0035,.010,.003],glint:[.0025,.0025,.002]};let minimum=Infinity,maximum=0;
    for(const amount of [-1,0,1])for(const side of [-1,1]){const fix=api.foxEyeFixation({...p,eyeAim:amount},side,false),mirror={...closed,positions:closed.positions.map((v,j)=>j%3===2?v*side:v)};for(const [name,r] of Object.entries(sizes)){const q=fix.positions[name];for(let gx=-4;gx<=4;gx++)for(let gy=-4;gy<=4;gy++){const z=1-(gx/4)**2-(gy/4)**2;if(z<0)continue;const dx=q[0]+r[0]*gx/4,dy=q[1]+r[1]*gy/4,x=mount.center[0]+co*dx-si*dy,y=mount.center[1]+si*dx+co*dy,eye=mount.center[2]+side*q[2]+r[2]*Math.sqrt(z);maximum=Math.max(maximum,((dx-mount.cx)/mount.innerX)**2+(dy/mount.innerY)**2);minimum=Math.min(minimum,rayZ(mirror,x,y)-eye);}}}
    expect(maximum).toBeLessThan(.7);expect(minimum).toBeGreaterThan(.005);
  });
  it('records genuine nonzero examples while preserving every original timeline field, populations, encounters and deterministic replay',()=>{
    const {c,pair,frames}=recorded(),before=JSON.stringify(pair),seen=[];for(let step=0;step<frames.length;step++)frames[step].foxes.forEach((p,index)=>{if(Math.abs(p.eyeAim)>.05){const target=api.foxEyeTarget(p);expect(target).not.toBeNull();expect(target).toMatchObject({id:p.prey,index:p.preyIndex,x:p.preyCueSnapshot.x,z:p.preyCueSnapshot.z});seen.push({step,index});}});
    expect(seen).toContainEqual({step:77,index:5});expect(seen.length).toBeGreaterThan(200);expect(frames[77].foxes[5].eyeAim).toBeCloseTo(-.696990424919125,14);expect(frames[77].foxes[5].state).toBe('Listening');
    const original=frames.map(frame=>Object.fromEntries(Object.entries(frame).map(([id,poses])=>[id,poses.map(p=>Object.fromEntries(Object.entries(p).filter(([key])=>!['eyeAim','earFollowPitch','earFollowYaw','crossingCue','crossingLook','crossingCooldown','crossing','crossingIndex','crossingDistance'].includes(key))))])));
    expect(digest(original)).toBe('f3d50449b45d5930f8c5c3f7096609e3fc5cac045c4b4a20b544924cd8485aea');expect(digest(pair)).toBe('846ec83134c2aff034b6f1c2db6d29f335d6019ed727a3243cfc2249787e9f6b');expect(JSON.stringify(pair)).toBe(before);expect(JSON.stringify(api.behaviorTimeline(c,pair.baseline))).toBe(JSON.stringify(frames));expect(api.encounters(frames,c).find(e=>e.kind==='spacing')).toMatchObject({id:'spacing:rabbits:3:120:129:rabbits:1'});
    const base=frames[77].foxes[5],middle=api.blendPose({...base,eyeAim:-1},{...base,eyeAim:1},.5,'foxes');expect(middle.eyeAim).toBeCloseTo(0,14);expect(api.foxEyeFixation(middle,1,false).amount).toBeCloseTo(0,14);
  });
  it('has no fixation after prey removal at the intervention sample',()=>{
    const c=api.normalize({...config,event:'remove',target:'rabbits',eventStep:80}),pair=api.compare(c),frames=api.behaviorTimeline(c,pair.experiment);expect(frames.slice(0,80).some(f=>f.foxes.some(p=>Math.abs(p.eyeAim)>.05))).toBe(true);for(const frame of frames.slice(80))for(const p of frame.foxes){expect(p.eyeAim).toBe(0);expect(api.foxEyeTarget(p)).toBeNull();expect(api.foxEyeFixation(p,1,false).amount).toBe(0);}
  });
  it('keeps genuine moving and turning prey fixation nonzero and eased at quarter-sample display times while raw recorded validation stays strict',()=>{
    const {frames}=recorded(),before=JSON.stringify(frames);let checked=0;
    for(let step=10;step<=12;step++){
      const index=2,a=frames[step].foxes[index],b=frames[step+1].foxes[index];expect(a.state).toBe('Stalking');expect(b.state).toBe('Stalking');expect(a.preyIndex).toBe(6);expect(b.preyIndex).toBe(6);expect(Math.hypot(b.x-a.x,b.z-a.z)).toBeGreaterThan(.01);expect(Math.abs(b.yaw-a.yaw)).toBeGreaterThan(.1);
      expect(api.blendPose(a,b,0,'foxes')).toBe(a);expect(api.blendPose(a,b,1,'foxes')).toBe(b);
      for(const alpha of [.25,.5,.75]){
        const p=api.blendPose(a,b,alpha,'foxes',frames[step-1].foxes[index],frames[step+2].foxes[index]),fix=api.foxEyeFixation(p,1,false),frame=api.blendFrame(frames[step],frames[step+1],alpha,frames[step-1],frames[step+2]),expected=a.eyeAim+(b.eyeAim-a.eyeAim)*alpha;
        expect(api.foxEyeTarget(p)).toBeNull();expect(fix.source).toBe('interpolated');expect(fix.alpha).toBe(alpha);expect(Math.abs(fix.amount)).toBeGreaterThan(.1);expect(fix.amount).toBeCloseTo(expected,14);expect(fix.offset).toBeCloseTo(expected*.0032,14);expect(api.foxEyeFixation(frame.foxes[index],1,false)).toEqual(fix);
        expect(fix.endpoints).toEqual([api.foxEyeTarget(a),api.foxEyeTarget(b)]);expect(api.foxEyeFixation(p,-1,false).offset).toBeCloseTo(-fix.offset,14);expect(api.foxEyeFixation(p,1,true)).toMatchObject({source:'neutral',amount:0,alpha:null,endpoints:null});checked++;
      }
    }
    expect(checked).toBe(9);expect(JSON.stringify(frames)).toBe(before);
  });
  it('neutralizes cancelled, removed, mismatched and malformed display intervals without registering or changing original recorded endpoints',()=>{
    const a=fixture();a.footPlants=[{x:1,z:2,planted:true}];
    for(const patch of [{state:'Searching',eyeAim:0},{prey:null,preyIndex:null,preyCueSnapshot:null,attention:null,eyeAim:0},{active:false,eyeAim:0},{eyeAim:NaN},{attention:{...a.attention,x:a.attention.x+.01}},{prey:'voles',preyCueSnapshot:{...a.preyCueSnapshot,id:'voles'},attention:{...a.attention,id:'voles'}}]){
      const b={...a,...patch},beforeA=JSON.stringify(a),beforeB=JSON.stringify(b);expect(api.blendPose(a,b,0,'foxes')).toBe(a);expect(api.blendPose(a,b,1,'foxes')).toBe(b);
      for(const alpha of [.25,.5,.75]){const p=api.blendPose(a,b,alpha,'foxes');expect(api.foxEyeFixation(p,1,false)).toMatchObject({source:'neutral',amount:0,alpha:null,endpoints:null});if(!b.active){expect(p).not.toBe(a);expect(p).toEqual(a);expect(p.footPlants).toBe(a.footPlants);}}
      expect(JSON.stringify(a)).toBe(beforeA);expect(JSON.stringify(b)).toBe(beforeB);expect(api.foxEyeFixation(a,1,false).source).toBe('recorded');expect(api.foxEyeFixation(a,1,false).amount).toBe(.7);
    }
    const moving=recorded().frames,fa=moving[10].foxes[2],fb=moving[11].foxes[2],badBefore={...moving[9].foxes[2],x:fb.x>fa.x?-Infinity:Infinity},badDraw=api.blendPose(fa,fb,.5,'foxes',badBefore,moving[12].foxes[2]);expect(Number.isFinite(badDraw.x)).toBe(false);expect(api.foxEyeFixation(badDraw,1,false).amount).toBe(0);
    const c=api.normalize({...config,event:'remove',target:'rabbits',eventStep:80}),pair=api.compare(c),frames=api.behaviorTimeline(c,pair.experiment),index=frames[79].foxes.findIndex(p=>api.foxEyeTarget(p)&&Math.abs(p.eyeAim)>.05);expect(index).toBeGreaterThanOrEqual(0);
    const from=frames[79].foxes[index],to=frames[80].foxes[index];expect(api.foxEyeTarget(to)).toBeNull();for(const alpha of [.25,.5,.75])expect(api.foxEyeFixation(api.blendPose(from,to,alpha,'foxes'),1,false).amount).toBe(0);expect(api.foxEyeFixation(api.blendPose(from,to,1,'foxes'),1,false).amount).toBe(0);
  });
  it('keeps fractional display provenance private, detached and invalidated by mutations instead of trusting copied interpolation flags',()=>{
    const {frames}=recorded(),a=frames[10].foxes[2],b=frames[11].foxes[2],before=JSON.stringify([a,b]);
    const p=api.blendPose(a,b,.5,'foxes',frames[9].foxes[2],frames[12].foxes[2]),fix=api.foxEyeFixation(p,1,false);expect(fix.source).toBe('interpolated');expect(Object.keys(p).sort()).toEqual(Object.keys(a).sort());
    const copied={...p,source:'interpolated',alpha:.5,endpoints:fix.endpoints};expect(api.foxEyeFixation(copied,1,false).source).toBe('neutral');expect(api.foxEyeFixation(copied,1,false).amount).toBe(0);
    fix.cue.x=999;fix.endpoints[0].x=999;fix.endpoints[1].amount=999;expect(api.foxEyeFixation(p,1,false).endpoints).toEqual([api.foxEyeTarget(a),api.foxEyeTarget(b)]);
    const aim=p.eyeAim;p.eyeAim+=.01;expect(api.foxEyeFixation(p,1,false).amount).toBe(0);p.eyeAim=aim;
    const attention=p.attention;p.attention={...attention,x:attention.x+.01};expect(api.foxEyeFixation(p,1,false).amount).toBe(0);p.attention=attention;
    const endpointAim=b.eyeAim;b.eyeAim+=.01;expect(api.foxEyeFixation(p,1,false).amount).toBe(0);b.eyeAim=endpointAim;
    expect(api.foxEyeFixation(p,1,false).amount).toBeCloseTo((a.eyeAim+b.eyeAim)/2,14);expect(JSON.stringify([a,b])).toBe(before);expect(api.foxEyeFixation(a,1,false).source).toBe('recorded');
  });

});
