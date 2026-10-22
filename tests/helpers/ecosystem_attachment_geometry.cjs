// Test/audit geometry only; this is never loaded by the ecology tool.
function torsoMatrix(api,id,pose,reduced=false){
  const a=api.mammalArticulation(id,pose,reduced),home=id==='foxes'?[-.10,.49,0]:[-.12,.335,0];
  const cx=Math.cos(a.ribRoll),sx=Math.sin(a.ribRoll),cz=Math.cos(a.spineFlex),sz=Math.sin(a.spineFlex),x=a.bodyStretch,y=a.ribScaleY,z=a.ribScaleZ;
  const m=[cz*x,cx*sz*x,sx*sz*x,0,-sz*y,cx*cz*y,sx*cz*y,0,0,-sx*z,cx*z,0,0,0,0,1];
  for(let axis=0;axis<3;axis++)m[12+axis]=home[axis]-m[axis]*home[0]-m[4+axis]*home[1]-m[8+axis]*home[2];return m;
}
function transform(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
function inverse(m){
  const a=m[0],b=m[4],c=m[8],d=m[1],e=m[5],f=m[9],g=m[2],h=m[6],i=m[10],det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
  const n=[(e*i-f*h)/det,(f*g-d*i)/det,(d*h-e*g)/det,0,(c*h-b*i)/det,(a*i-c*g)/det,(b*g-a*h)/det,0,(b*f-c*e)/det,(c*d-a*f)/det,(a*e-b*d)/det,0,0,0,0,1];
  for(let axis=0;axis<3;axis++)n[12+axis]=-n[axis]*m[12]-n[4+axis]*m[13]-n[8+axis]*m[14];return n;
}
function joints(api,id,pose,index,hind,side){
  if(id==='rabbits')return api.rabbitLegPose(pose,index,hind,side);
  const contact=api.foxFooting(pose,index,hind,side),foot=api.footPose(id,pose,hind,side),j=api.foxLegPose(pose,hind,side,contact),sy=1-.12*Math.max(pose.crouch||0,(pose.rest||0)*.65),ca=Math.cos(foot.angle),sa=Math.sin(foot.angle);
  const point=(x,y)=>[(hind?-.33:.29)+ca*x-sa*sy*y,.4+foot.height+sa*x+ca*sy*y,side*.16+contact.z],kx=j.hipX+.21*Math.sin(j.upper),ky=j.hipY-.21*Math.cos(j.upper);
  return {hip:point(j.hipX,j.hipY),knee:point(kx,ky),paw:point(kx+.20*Math.sin(j.lower),ky-.20*Math.cos(j.lower))};
}
function rayDomain(surface){
  const p=surface.positions,triangles=[],buckets=Array.from({length:surface.rings},()=>[]),first=p[0],last=p[(surface.rings*(surface.sides+1))*3],span=last-first;
  for(let at=0;at<surface.indices.length;at+=3){
    const a=surface.indices[at]*3,b=surface.indices[at+1]*3,c=surface.indices[at+2]*3,den=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);
    if(Math.abs(den)<1e-14)continue;
    const tri={a:[p[a],p[a+1],p[a+2]],b:[p[b],p[b+1],p[b+2]],c:[p[c],p[c+1],p[c+2]],den},index=triangles.push(tri)-1;
    const lo=Math.max(0,Math.min(surface.rings-1,Math.floor((Math.min(p[a],p[b],p[c])-first)/span*surface.rings))),hi=Math.max(0,Math.min(surface.rings-1,Math.floor((Math.max(p[a],p[b],p[c])-first)/span*surface.rings)));
    for(let bucket=lo;bucket<=hi;bucket++)buckets[bucket].push(index);
  }
  return point=>{
    if(point[0]<first||point[0]>last)return -Infinity;
    const bucket=Math.max(0,Math.min(surface.rings-1,Math.floor((point[0]-first)/span*surface.rings)));let lo=Infinity,hi=-Infinity;
    for(const at of buckets[bucket]){const {a,b,c,den}=triangles[at],u=((b[1]-c[1])*(point[0]-c[0])+(c[0]-b[0])*(point[1]-c[1]))/den,v=((c[1]-a[1])*(point[0]-c[0])+(a[0]-c[0])*(point[1]-c[1]))/den,w=1-u-v;if(u>=-1e-10&&v>=-1e-10&&w>=-1e-10){const z=u*a[2]+v*b[2]+w*c[2];lo=Math.min(lo,z);hi=Math.max(hi,z);}}
    return Math.min(point[2]-lo,hi-point[2]);
  };
}
function capSamples(positions){
  const cap=positions.slice(221*3,222*3),out=[cap];
  for(let side=0;side<12;side++)for(let a=0;a<=3;a++)for(let b=0;b<=3-a;b++){
    const weights=[a/3,b/3,1-a/3-b/3],first=positions.slice(side*3,side*3+3),next=positions.slice((side+1)*3,(side+1)*3+3);
    out.push([0,1,2].map(axis=>weights[0]*cap[axis]+weights[1]*first[axis]+weights[2]*next[axis]));
  }
  return out;
}
function interiorRadius(surface,point){
  const p=surface.positions,dot=(a,b)=>a.reduce((sum,value,k)=>sum+value*b[k],0),sub=(a,b)=>a.map((value,k)=>value-b[k]);let radius=Infinity;
  for(let at=0;at<surface.indices.length;at+=3){
    const a=p.slice(surface.indices[at]*3,surface.indices[at]*3+3),b=p.slice(surface.indices[at+1]*3,surface.indices[at+1]*3+3),c=p.slice(surface.indices[at+2]*3,surface.indices[at+2]*3+3),ab=sub(b,a),ac=sub(c,a),ap=sub(point,a),d1=dot(ab,ap),d2=dot(ac,ap);let closest;
    if(Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])<1e-14)continue;
    if(d1<=0&&d2<=0)closest=a;
    else{const bp=sub(point,b),d3=dot(ab,bp),d4=dot(ac,bp);
      if(d3>=0&&d4<=d3)closest=b;
      else{const vc=d1*d4-d3*d2;
        if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);closest=a.map((value,k)=>value+v*ab[k]);}
        else{const cp=sub(point,c),d5=dot(ab,cp),d6=dot(ac,cp);
          if(d6>=0&&d5<=d6)closest=c;
          else{const vb=d5*d2-d1*d6;
            if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);closest=a.map((value,k)=>value+w*ac[k]);}
            else{const va=d3*d6-d5*d4;
              if(va<=0&&d4-d3>=0&&d5-d6>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));closest=b.map((value,k)=>value+w*(c[k]-value));}
              else{const denominator=va+vb+vc;if(Math.abs(denominator)<1e-20)continue;const v=vb/denominator,w=vc/denominator;closest=a.map((value,k)=>value+v*ab[k]+w*ac[k]);}
            }
          }
        }
      }
    }
    radius=Math.min(radius,Math.hypot(...sub(point,closest)));
  }
  return radius;
}
function world(api,id,pose,index,point){
  const size=(id==='foxes'?1:.86)*(.94+(index%5)*.028),posture=api.mammalPosture(id,pose),angle=id==='foxes'?-(pose.pounce||0)*.12:0,c=Math.cos(angle),s=Math.sin(angle),cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw);
  const x=size*(c*point[0]-s*point[1]),y=posture.drop+size*(s*point[0]+c*point[1]),z=size*point[2];
  return [pose.x+cy*x+sy*z,api.groundHeight(pose.x,pose.z)+pose.altitude+y,pose.z-sy*x+cy*z];
}
module.exports={torsoMatrix,transform,inverse,joints,rayDomain,capSamples,interiorRadius,world};
