import {beforeEach,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const xyz=(a,k)=>Array.from(a.slice(k*3,k*3+3));
const delta=(a,b)=>Math.hypot(...a.map((v,j)=>v-b[j]));
const feeding=(extra={})=>({active:true,state:'Grazing',activity:Math.PI/16,phase:0,distance:0,moving:0,stride:0,forage:.75,rest:0,pounce:0,altitude:.025,headRaise:0,...extra});
const key=p=>p.map(n=>Math.round(n*1e10)).join(',');
const mounts={foxes:{center:[.676,.610,0],scale:[.027,.022,.028],head:[.24,.58,0]},rabbits:{center:[.455,.395,0],scale:[.020,.015,.023],head:[.24,.4,0]}};

describe('species-shaped noses and recorded rabbit facial detail',()=>{
  it('builds closed bounded nasal pads with finite outward normals and a welded UV seam',()=>{
    for(const id of ['foxes','rabbits']){
      const g=api.mammalNoseSurface(id),p=g.positions,n=g.normals,edges=new Map();
      expect(p.length/3).toBe(617);expect(g.indices.length/3).toBe(1200);
      for(const field of ['positions','normals','uv','tints'])expect(g[field].every(Number.isFinite)).toBe(true);
      expect(g.indices.every(k=>Number.isInteger(k)&&k>=0&&k<p.length/3)).toBe(true);
      for(let k=0;k<p.length/3;k++)expect(Math.hypot(...xyz(n,k))).toBeCloseTo(1,12);
      for(let f=0;f<g.indices.length;f+=3){
        const [a,b,c]=g.indices.slice(f,f+3),pa=xyz(p,a),pb=xyz(p,b),pc=xyz(p,c),u=pb.map((v,j)=>v-pa[j]),v=pc.map((x,j)=>x-pa[j]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        expect(Math.hypot(...cross)).toBeGreaterThan(1e-5);expect(cross.reduce((sum,x,j)=>sum+x*(n[a*3+j]+n[b*3+j]+n[c*3+j]),0)).toBeGreaterThan(0);
        for(const [first,last] of [[a,b],[b,c],[c,a]]){const pair=[key(xyz(p,first)),key(xyz(p,last))].sort().join('|');edges.set(pair,(edges.get(pair)||0)+1);}
      }
      expect([...edges.values()].every(count=>count===2)).toBe(true);
      for(const [a,b] of g.seams){expect(xyz(p,a)).toEqual(xyz(p,b));expect(xyz(n,a)).toEqual(xyz(n,b));expect(g.uv[a*2]).toBe(0);expect(g.uv[b*2]).toBe(1);}
    }
  });

  it('gives both nasal pads paired dark nostril relief and keeps the fox triangle and rabbit cleft distinct',()=>{
    const fox=api.mammalNoseSurface('foxes'),rabbit=api.mammalNoseSurface('rabbits');
    for(const g of [fox,rabbit]){
      for(const side of [-1,1])expect(g.tints.filter((t,k)=>t>.55&&g.positions[k*3]>0&&g.positions[k*3+2]*side>0).length).toBeGreaterThan(1);
      expect(Math.min(...g.tints)).toBeGreaterThanOrEqual(0);expect(Math.max(...g.tints)).toBeLessThanOrEqual(1);
      const cloud=new Set(Array.from({length:g.positions.length/3},(_,k)=>key(xyz(g.positions,k))));
      for(let k=0;k<g.positions.length/3;k++){const p=xyz(g.positions,k);expect(cloud.has(key([p[0],p[1],-p[2]]))).toBe(true);}
    }
    expect(fox.positions).not.toEqual(rabbit.positions);
    expect(rabbit.positions[0]).toBeLessThan(.90);expect(fox.positions[0]).toBeGreaterThan(.92);
  });

  it('is exactly neutral without a real grazing clock, while inactive, resting, airborne, pouncing or reduced',()=>{
    const neutral={lift:0,scaleX:1,scaleY:1,scaleZ:1,fan:0};
    for(const id of ['foxes','voles','owls',undefined])expect(api.mammalNosePose(id,feeding(),false)).toEqual(neutral);
    for(const p of [undefined,null,{},feeding({active:false}),feeding({activity:undefined}),feeding({activity:NaN}),feeding({activity:-1}),feeding({state:'Resting'}),feeding({rest:1}),feeding({state:'Alert'}),feeding({pounce:.1}),feeding({altitude:.05}),feeding({forage:0}),feeding({stride:1}),feeding({headRaise:1}),feeding({neighborLook:1})])expect(api.mammalNosePose('rabbits',p,false)).toEqual(neutral);
    expect(api.mammalNosePose('rabbits',feeding(),true)).toEqual(neutral);
    const phase=.99*Math.PI*2,activity=(Math.PI/2-phase*1.7+Math.PI*4)/8;
    expect(api.mammalNosePose('rabbits',feeding({phase,activity,moving:1.15,stride:.5}),false)).toEqual(neutral);
    expect(api.mammalNosePose('rabbits',feeding(),false).lift).toBeGreaterThan(.0017);
  });

  it('uses only recorded values and stays continuous, restrained and exactly repeatable on seek',()=>{
    const p=feeding(),before=JSON.stringify(p);let lift=0,fan=0,last=null,maxJump=0;
    for(let tick=0;tick<=960;tick++){
      const a=api.mammalNosePose('rabbits',{...p,activity:tick/240},false);
      expect(Object.values(a).every(Number.isFinite)).toBe(true);expect(a.lift).toBeGreaterThanOrEqual(0);expect(a.lift).toBeLessThanOrEqual(.002);
      for(const field of ['scaleX','scaleY','scaleZ'])expect(Math.abs(a[field]-1)).toBeLessThanOrEqual(.03);
      expect(a.fan).toBeGreaterThanOrEqual(0);expect(a.fan).toBeLessThanOrEqual(.045);
      if(last)maxJump=Math.max(maxJump,Math.abs(a.lift-last.lift));last=a;lift=Math.max(lift,a.lift);fan=Math.max(fan,a.fan);
    }
    expect(lift).toBeGreaterThan(.00179);expect(fan).toBeGreaterThan(.0449);expect(maxJump).toBeLessThan(.0001);
    const first=api.mammalNosePose('rabbits',p,false);api.mammalNosePose('rabbits',{...p,activity:100},false);expect(api.mammalNosePose('rabbits',p,false)).toEqual(first);expect(JSON.stringify(p)).toBe(before);
  });

  it('curves six varied whiskers through their species profiles while keeping each original muzzle root fixed through the fan',()=>{
    for(const id of ['foxes','rabbits']){
      const raw=api.mammalWhiskers(id,null,true),moving=api.mammalWhiskers(id,feeding(),false),fox=id==='foxes',profile=api.mammalWhiskerProfile(id);
      expect(raw).toMatchObject({segments:8,strands:6,fan:0});expect(raw.positions.length).toBe(288);expect(moving.positions.every(Number.isFinite)).toBe(true);
      let displacement=0;
      raw.roots.forEach((index,strand)=>{
        const side=strand<3?-1:1,slot=strand%3,root=[(fox?.602:.426)-.24,(fox?.600:.391)+(slot-1)*.013-(fox?.58:.4),side*(fox?.051:.043)];
        expect(xyz(raw.positions,index)).toEqual(root);expect(xyz(moving.positions,index)).toEqual(root);
        const mid=root.map((v,j)=>v+(.5*profile.control[slot][j]+.25*profile.tips[slot][j])*(j===2?side:1)),tip=root.map((v,j)=>v+profile.tips[slot][j]*(j===2?side:1));
        expect(delta(xyz(raw.positions,index+7),mid)).toBeLessThan(1e-15);expect(delta(xyz(raw.positions,index+15),tip)).toBeLessThan(1e-15);
        for(let segment=0;segment<7;segment++)expect(xyz(moving.positions,index+segment*2+1)).toEqual(xyz(moving.positions,index+segment*2+2));
        for(let k=index;k<index+16;k++)displacement=Math.max(displacement,delta(xyz(raw.positions,k),xyz(moving.positions,k)));
      });
      if(fox)expect(displacement).toBe(0);else{expect(displacement).toBeGreaterThan(.005);expect(displacement).toBeLessThan(.019);}
    }
  });

  it('returns detached cached surfaces, reuses bounded whisker buffers and reconstructs exact frozen curves',()=>{
    for(const id of ['foxes','rabbits']){
      const raw=api.mammalNoseSurface(id),before=JSON.stringify(raw);raw.positions[0]=999;raw.normals[0]=999;raw.tints[0]=999;raw.seams[0][0]=999;expect(JSON.stringify(api.mammalNoseSurface(id))).toBe(before);
      const target=new Float32Array(295).fill(17),p=feeding(),reference=api.mammalWhiskers(id,p,false);
      expect(api.mammalWhiskers(id,p,false,target).positions).toBe(target);expect(Array.from(target.slice(288))).toEqual(Array(7).fill(17));
      for(let k=0;k<288;k++)expect(target[k]).toBeCloseTo(reference.positions[k],7);
      api.mammalWhiskers(id,{...p,activity:2},false,target);api.mammalWhiskers(id,p,false,target);
      for(let k=0;k<288;k++)expect(target[k]).toBeCloseTo(reference.positions[k],7);
      expect(api.mammalWhiskers(id,p,true)).toEqual(api.mammalWhiskers(id,{...p,activity:500},true));
    }
    expect(api.mammalNoseSurface('voles')).toBeNull();expect(api.mammalWhiskers('owls',feeding(),false)).toBeNull();
  });

  it('retains the actual original tapered fox and faceted rabbit nose volumes through the full twitch',()=>{
    const require=createRequire(import.meta.url),T=require(resolve(process.cwd(),'vendor/three-r128/three.min.js')),oldFox=new T.SphereGeometry(1,20,12),fp=oldFox.getAttribute('position');
    for(let k=0;k<fp.count;k++){const x=fp.getX(k),taper=.8-.28*x;fp.setXYZ(k,x,fp.getY(k)*taper,fp.getZ(k)*taper);}
    for(const [id,original] of [['foxes',oldFox],['rabbits',new T.IcosahedronGeometry(1,2)]]){
      const g=api.mammalNoseSurface(id),p=original.getAttribute('position'),indices=original.index,planes=[];
      for(let f=0;f<(indices?indices.count:p.count);f+=3){const a=new T.Vector3().fromBufferAttribute(p,indices?indices.getX(f):f),b=new T.Vector3().fromBufferAttribute(p,indices?indices.getX(f+1):f+1),c=new T.Vector3().fromBufferAttribute(p,indices?indices.getX(f+2):f+2),normal=b.sub(a).cross(c.sub(a));if(normal.length()<1e-10)continue;normal.normalize();planes.push([normal.x,normal.y,normal.z,normal.dot(a)]);}
      let maxViolation=-Infinity;
      for(let tick=0;tick<=10;tick++){
        const a=api.mammalNosePose(id,feeding({activity:Math.asin(Math.pow(tick/10,.25))/8}),false);
        for(let k=0;k<g.positions.length;k+=3){const x=g.positions[k]*a.scaleX,y=g.positions[k+1]*a.scaleY+a.lift/mounts[id].scale[1],z=g.positions[k+2]*a.scaleZ;for(const plane of planes)maxViolation=Math.max(maxViolation,plane[0]*x+plane[1]*y+plane[2]*z-plane[3]);}
      }
      expect(maxViolation).toBeLessThan(0);
    }
  });

  it('leaves input poses, head/eye/jaw articulation, paw fitting, encounter evidence and population values exact',()=>{
    const config={event:'none'},pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),before=JSON.stringify({pair,frames}),encounters=JSON.stringify(api.encounters(frames,config));
    api.mammalNoseSurface('foxes');api.mammalNoseSurface('rabbits');
    for(let step=0;step<frames.length;step+=17)for(const id of ['foxes','rabbits'])for(let index=0;index<16;index++){
      const p=frames[step][id][index],head=api.mammalArticulation(id,p,false),feet=[-1,1].flatMap(side=>[false,true].map(hind=>({pose:api.footPose(id,p,hind,side),fit:id==='foxes'?api.foxFooting(p,index,hind,side):api.rabbitFooting(p,index,hind,side)})));
      api.mammalNosePose(id,p,false);api.mammalWhiskers(id,p,false);
      expect(api.mammalArticulation(id,p,false)).toEqual(head);expect([-1,1].flatMap(side=>[false,true].map(hind=>({pose:api.footPose(id,p,hind,side),fit:id==='foxes'?api.foxFooting(p,index,hind,side):api.rabbitFooting(p,index,hind,side)})))).toEqual(feet);
    }
    expect(JSON.stringify({pair,frames})).toBe(before);expect(JSON.stringify(api.encounters(frames,config))).toBe(encounters);expect(JSON.stringify(api.behaviorTimeline(config,pair.baseline))).toBe(JSON.stringify(frames));
  });

  it('keeps every actual nasal vertex clear of the terrain through recorded feeding, stance and landings',()=>{
    const require=createRequire(import.meta.url),T=require(resolve(process.cwd(),'vendor/three-r128/three.min.js')),headMatrix=new T.Matrix4(),bodyMatrix=new T.Matrix4(),q=new T.Quaternion(),euler=new T.Euler(),one=new T.Vector3(1,1,1),point=new T.Vector3(),translation=new T.Vector3();
    let checked=0,lowest=Infinity,twitches=0;
    const config={event:'none',enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:40},frames=api.behaviorTimeline(config,api.compare(config).baseline),surfaces={foxes:api.mammalNoseSurface('foxes'),rabbits:api.mammalNoseSurface('rabbits')};
    for(const frame of frames)for(const id of ['foxes','rabbits'])for(let index=0;index<16;index++){
      const p=frame[id][index];if(!p.active)continue;const art=api.mammalArticulation(id,p,false),post=api.mammalPosture(id,p),nasal=api.mammalNosePose(id,p,false),mount=mounts[id],size=(id==='rabbits'?.86:1)*(.94+index%5*.028),cy=Math.cos(p.yaw),sn=Math.sin(p.yaw),vertices=surfaces[id].positions;
      euler.set(art.headRoll,art.headYaw,art.headPitch);q.setFromEuler(euler);translation.set(mount.head[0]+art.headReach,mount.head[1]-art.headDrop,0);headMatrix.compose(translation,q,one);bodyMatrix.makeRotationZ(id==='foxes'?-(p.pounce||0)*.12:0);if(nasal.lift>.0001)twitches++;
      for(let k=0;k<vertices.length;k+=3){
        point.set(mount.center[0]-mount.head[0]+mount.scale[0]*vertices[k]*nasal.scaleX,mount.center[1]-mount.head[1]+nasal.lift+mount.scale[1]*vertices[k+1]*nasal.scaleY,mount.scale[2]*vertices[k+2]*nasal.scaleZ).applyMatrix4(headMatrix).applyMatrix4(bodyMatrix);
        const wx=p.x+size*(cy*point.x+sn*point.z),wz=p.z+size*(-sn*point.x+cy*point.z),wy=api.groundHeight(p.x,p.z)+p.altitude+post.drop+size*point.y;lowest=Math.min(lowest,wy-api.groundHeight(wx,wz));checked++;
      }
    }
    expect(checked).toBeGreaterThan(100000);expect(twitches).toBeGreaterThan(10);expect(lowest).toBeGreaterThan(.003);
  });
});
