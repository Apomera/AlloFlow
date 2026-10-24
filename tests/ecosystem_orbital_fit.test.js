import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const point=(array,index)=>Array.from(array.slice(index*3,index*3+3));
const distance=(a,b)=>Math.hypot(...a.map((n,j)=>n-b[j]));
function rayZ(surface,x,y){
  let best=-Infinity;const p=surface.positions;
  for(let offset=0;offset<surface.indices.length;offset+=3){
    const [a,b,c]=surface.indices.slice(offset,offset+3).map(index=>index*3),den=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);if(Math.abs(den)<1e-14)continue;
    const wa=((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/den,wb=((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/den,wc=1-wa-wb;
    if(Math.min(wa,wb,wc)<-1e-10)continue;best=Math.max(best,wa*p[a+2]+wb*p[b+2]+wc*p[c+2]);
  }
  return best;
}

describe('fitted eye sockets and continuous orbital fur',()=>{
  it('fits depth to the original skull while preserving gaze placement and the original eye/lid dimensions',()=>{
    for(const [id,center,angle,oldZ] of [['foxes',[.191,.095],.13,.105],['rabbits',[.085,.062],.15,.114]]){
      const mount=api.eyeMount(id),site=api.skullSite(id,mount.center[0]+mount.headHome[0],mount.center[1]+mount.headHome[1]);
      expect(mount.center.slice(0,2)).toEqual(center);expect(mount.angle).toBe(angle);expect(mount.skullCenter).toEqual(site);
      expect(mount.center[2]).toBeLessThan(oldZ-.006);expect(mount.inset).toBeCloseTo(oldZ-mount.center[2],14);
      expect(mount.rx).toBe(id==='foxes'?.034:.032);expect(mount.ry).toBe(id==='foxes'?.024:.032);expect(mount.innerX).toBe(.024);expect(mount.innerY).toBe(id==='foxes'?.015:.025);
      expect(mount.visibility).toHaveLength(6);for(const ray of mount.visibility)expect(mount.center[2]+ray.eyeDepth-ray.skullZ).toBeGreaterThanOrEqual(.002-1e-12);
    }
  });

  it('joins the fixed actual eyelid perimeter to exact barycentric samples on the unchanged skull and shares boundary normals',()=>{
    for(const id of ['foxes','rabbits']){
      const mount=api.eyeMount(id),orbit=api.orbitalSurface(id),head=api.mammalSurface(id,'head'),open=api.mammalEyelids(id,1),closed=api.mammalEyelids(id,0);
      expect(orbit.positions.length/3).toBe(574);expect(orbit.indices.length/3).toBe(960);expect(orbit.rows).toBe(6);expect(orbit.columns).toBe(40);expect(orbit.seams).toHaveLength(82);
      for(let eye=0;eye<2;eye++)for(let half=0;half<2;half++)for(let column=0;column<=20;column++){
        const lid=(eye*2+half)*105+4*21+column,orb=orbit.innerRims[eye][half*20+column];
        expect(distance(point(orbit.positions,orb),point(open.positions,lid))).toBeLessThan(2e-15);expect(point(closed.positions,lid)).toEqual(point(open.positions,lid));expect(point(orbit.normals,orb)).toEqual(point(open.normals,lid));
      }
      for(const seam of orbit.seams){
        const indices=head.indices.slice(seam.triangle*3,seam.triangle*3+3),original=[0,1,2].map(axis=>indices.reduce((sum,index,k)=>sum+head.positions[index*3+axis]*seam.barycentric[k],0));
        expect(Math.min(...seam.barycentric)).toBeGreaterThanOrEqual(-1e-10);expect(seam.barycentric.reduce((a,b)=>a+b,0)).toBeCloseTo(1,14);
        expect(distance(seam.position,[original[0]-mount.headHome[0],original[1]-mount.headHome[1],original[2]])).toBeLessThan(1e-14);expect(seam.side*original[2]).toBeGreaterThan(0);
      }
      for(let eye=0;eye<2;eye++)for(let row=0;row<=6;row++){const first=eye*287+row*41,last=first+40;expect(distance(point(orbit.positions,first),point(orbit.positions,last))).toBeLessThan(1e-15);expect(distance(point(orbit.normals,first),point(orbit.normals,last))).toBeLessThan(1e-15);}
    }
  });

  it('uses finite outward surfaces throughout blinking and keeps the bridge outside the original closed skull',()=>{
    for(const id of ['foxes','rabbits']){
      const mount=api.eyeMount(id),orbit=api.orbitalSurface(id);let minimumFacing=Infinity,maximumNormalError=0;
      for(const surface of [orbit,...Array.from({length:21},(_,index)=>api.mammalEyelids(id,index/20))]){
        for(const name of ['positions','normals','uv','tints'])expect(surface[name].every(Number.isFinite)).toBe(true);
        const p=surface.positions,n=surface.normals,count=p.length/3;
        expect(surface.indices.every(index=>Number.isInteger(index)&&index>=0&&index<count)).toBe(true);
        for(let vertex=0;vertex<count;vertex++)maximumNormalError=Math.max(maximumNormalError,Math.abs(Math.hypot(...point(n,vertex))-1));
        for(let offset=0;offset<surface.indices.length;offset+=3){const [a,b,c]=surface.indices.slice(offset,offset+3),pa=point(p,a),pb=point(p,b),pc=point(p,c),u=pb.map((v,j)=>v-pa[j]),v=pc.map((x,j)=>x-pa[j]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],normal=point(n,a).map((x,j)=>x+n[b*3+j]+n[c*3+j]);if(Math.hypot(...cross)<1e-13)continue;minimumFacing=Math.min(minimumFacing,cross.reduce((sum,x,j)=>sum+x*normal[j],0));}
      }
      expect(maximumNormalError).toBeLessThan(1e-12);expect(minimumFacing).toBeGreaterThan(0);
      for(let vertex=0;vertex<orbit.positions.length/3;vertex++){const p=point(orbit.positions,vertex),side=p[2]<0?-1:1,site=api.skullSite(id,p[0]+mount.headHome[0],p[1]+mount.headHome[1],side);expect(side*(p[2]-site.position[2])).toBeGreaterThanOrEqual(-1e-14);}
    }
  });

  it('keeps all six central aperture rays clear when open and covers them above the unchanged eye and skull when closed',()=>{
    for(const id of ['foxes','rabbits']){
      const mount=api.eyeMount(id),open=api.mammalEyelids(id,1),closed=api.mammalEyelids(id,0),orbit=api.orbitalSurface(id),co=Math.cos(mount.angle),si=Math.sin(mount.angle);
      // Original renderer children in eye-local coordinates: fur pad, dark
      // globe, iris, pupil, glint (fox); fur pad, dark globe, glint (rabbit).
      // The analytic ellipsoid encloses the actual faceted sphere, so a lid
      // that clears this envelope also clears every rendered eye triangle.
      const children=id==='foxes'?
        [[0,0,0,.029,.019,.012],[.003,0,.008,.021,.013,.007],[.005,0,.013,.010,.011,.004],[.007,.001,.016,.0035,.010,.003],[.009,.005,.019,.0025,.0025,.002]]:
        [[0,0,0,.028,.026,.009],[.002,.001,.006,.020,.021,.010],[.007,.009,.015,.0035,.0035,.002]];
      function eyeEnvelope(dx,dy){return Math.max(...children.map(([x,y,z,rx,ry,rz])=>{const q=1-Math.pow((dx-x)/rx,2)-Math.pow((dy-y)/ry,2);return q>=0?z+rz*Math.sqrt(q):-Infinity;}));}
      for(const eye of [0,1])for(const ray of mount.sideVisibility[eye]){
        const x=mount.center[0]+co*ray.dx-si*ray.dy,y=mount.center[1]+si*ray.dx+co*ray.dy,eyeZ=mount.center[2]+ray.eyeDepth,eyeFront=mount.center[2]+eyeEnvelope(ray.dx,ray.dy);
        const mirror=surface=>({...surface,positions:surface.positions.map((value,index)=>index%3===2?value*ray.side:value)});
        expect(rayZ(mirror(open),x,y)).toBeLessThan(eyeZ);expect(rayZ(mirror(orbit),x,y)).toBeLessThan(eyeZ);expect(ray.skullZ).toBeLessThan(eyeZ-.001);
        expect(rayZ(mirror(closed),x,y)).toBeGreaterThan(Math.max(eyeFront,ray.skullZ)+.001);
      }
      // Also cover each eye layer's own footprint. This catches glint/pupil
      // edge leaks between the six fixed central inspection rays.
      for(const side of [-1,1])for(const child of children.slice(1)){
        const [cx,cy,cz,rx,ry,rz]=child,mirror={...closed,positions:closed.positions.map((value,index)=>index%3===2?value*side:value)};
        for(let gx=-4;gx<=4;gx++)for(let gy=-4;gy<=4;gy++){
          const q=1-Math.pow(gx/4,2)-Math.pow(gy/4,2);if(q<0)continue;
          const dx=cx+rx*gx/4,dy=cy+ry*gy/4,x=mount.center[0]+co*dx-si*dy,y=mount.center[1]+si*dx+co*dy;
          expect(rayZ(mirror,x,y)).toBeGreaterThan(mount.center[2]+cz+rz*Math.sqrt(q)+.001);
        }
      }
    }
  });

  it('protects the cached setup from caller mutation and reconstructs exact detached results and bounded blink targets',()=>{
    for(const id of ['foxes','rabbits']){
      const mount=api.eyeMount(id),orbit=api.orbitalSurface(id),lid=api.mammalEyelids(id,.3),mountBefore=JSON.stringify(mount),orbitBefore=JSON.stringify(orbit);
      mount.center[2]=999;mount.rimPositions[0][2]=999;mount.rimSites[0].position[2]=999;mount.outerSites[0].site.normal[0]=999;orbit.positions[0]=999;orbit.normals[0]=999;orbit.seams[0].barycentric[0]=999;orbit.innerRims[0][0]=999;orbit.skullSamples[0].triangle=999;
      for(const opening of [1,0,.6,.3])api.mammalEyelids(id,opening);
      expect(JSON.stringify(api.eyeMount(id))).toBe(mountBefore);expect(JSON.stringify(api.orbitalSurface(id))).toBe(orbitBefore);expect(api.mammalEyelids(id,.3)).toEqual(lid);
      const target=new Float32Array(1267).fill(17);expect(api.mammalEyelids(id,.3,target).positions).toBe(target);expect(Array.from(target.slice(1260))).toEqual(Array(7).fill(17));
      for(let index=0;index<1260;index++)expect(target[index]).toBeCloseTo(lid.positions[index],7);
    }
    expect(api.eyeMount('owls')).toBeNull();expect(api.orbitalSurface('voles')).toBeNull();expect(api.skullSite('foxes',99,99)).toBeNull();
  });
});
