// Rebuild the locally bundled Everest terrain from public Mapzen Terrarium tiles.
// Run: node dev-tools/build_scale_everest_terrain.cjs
// Heights are resampled, rounded to metres, and never stretched to match a summit.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
function readPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw Error('Not a PNG');
  let pos=8,width,height,depth,type,interlace; const chunks=[];
  while(pos<buf.length) {
    const len=buf.readUInt32BE(pos),tag=buf.toString('ascii',pos+4,pos+8),data=buf.subarray(pos+8,pos+8+len);
    if(tag==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];type=data[9];interlace=data[12];}
    if(tag==='IDAT')chunks.push(data); if(tag==='IEND')break; pos+=len+12;
  }
  if(width!==256||height!==256||depth!==8||interlace!==0||![2,6].includes(type))throw Error('Unsupported terrain PNG');
  const channels=type===6?4:3,stride=width*channels,raw=zlib.inflateSync(Buffer.concat(chunks)),out=Buffer.alloc(height*stride);
  if(raw.length!==(stride+1)*height)throw Error('Invalid terrain PNG length');
  let rp=0;
  for(let y=0;y<height;y++){
    const filter=raw[rp++];
    for(let i=0;i<stride;i++){
      const k=y*stride+i,a=i>=channels?out[k-channels]:0,b=y?out[k-stride]:0,c=y&&i>=channels?out[k-stride-channels]:0;
      let v=raw[rp++];
      if(filter===1)v+=a;else if(filter===2)v+=b;else if(filter===3)v+=(a+b)>>1;
      else if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
      else if(filter!==0)throw Error('Invalid PNG filter');
      out[k]=v&255;
    }
  }
  return (x,y)=>{const i=(y*width+x)*channels;return out[i]*256+out[i+1]+out[i+2]/256-32768;};
}
const center={latitude:27.98,longitude:86.925},zoom=12,width=241,spanMeters=18000,radius=6378137;
const cos=Math.cos(center.latitude*Math.PI/180);
function pixel(east,north){
  const lat=center.latitude+north/radius*180/Math.PI,lon=center.longitude+east/(radius*cos)*180/Math.PI;
  // Raster pixels are samples at cell centres.
  return [(lon+180)/360*2**zoom*256-.5,(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**zoom*256-.5];
}
async function main(){
  const nw=pixel(-spanMeters/2,spanMeters/2),se=pixel(spanMeters/2,-spanMeters/2),tiles=new Map(),sources=[];
  for(let y=Math.floor(nw[1]/256);y<=Math.floor((se[1]+1)/256);y++){
    for(let x=Math.floor(nw[0]/256);x<=Math.floor((se[0]+1)/256);x++){
      const url='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+zoom+'/'+x+'/'+y+'.png';
      const response=await fetch(url);if(!response.ok)throw Error('Terrain request failed: '+response.status);
      const bytes=Buffer.from(await response.arrayBuffer());
      tiles.set(x+','+y,readPng(bytes));
      sources.push({url,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),imagerySources:response.headers.get('x-amz-meta-x-imagery-sources')});
    }
  }
  function elevation(east,north){
    const [px,py]=pixel(east,north),ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
    function at(x,y){return tiles.get(Math.floor(x/256)+','+Math.floor(y/256))(x%256,y%256);}
    return Math.round((at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy);
  }
  const elevations=[];
  for(let row=0;row<width;row++)for(let col=0;col<width;col++)elevations.push(elevation((col/(width-1)-.5)*spanMeters,(.5-row/(width-1))*spanMeters));
  if(elevations.some(h=>!Number.isFinite(h)||h<3500||h>9100))throw Error('Unexpected terrain elevations');
  const data={version:1,width,spanMeters,center,spacingMeters:spanMeters/(width-1),verticalDatum:'SRTM orthometric heights, EGM96',projection:'Local east/north approximation on WGS84; horizontal distances use the centre latitude',elevations};
  const attribution={title:'Everest terrain',accessed:new Date().toISOString().slice(0,10),dataset:'Mapzen Terrain Tiles',registry:'https://registry.opendata.aws/terrain-tiles/',documentation:'https://github.com/tilezen/joerd/blob/master/docs/formats.md',attribution:'Mapzen; SRTM and GMTED2010 terrain data courtesy of the U.S. Geological Survey.',rights:'https://github.com/tilezen/joerd/blob/master/docs/attribution.md',processing:'Decoded Terrarium heights, bilinearly resampled to a 75 metre grid and rounded to whole metres. No vertical exaggeration or summit correction. This grid cannot resolve the exact summit height. Surface colors and snow are illustrative.',sources};
  for(const dir of ['stem_lab/assets/terrain','desktop/web-app/public/stem_lab/assets/terrain']){
    fs.mkdirSync(path.join(root,dir),{recursive:true});
    for(const [name,value] of [['everest-elevation.json',data],['everest-attribution.json',attribution]]){
      const file=path.join(root,dir,name),temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(value)+'\n');fs.renameSync(temp,file);
    }
  }
  console.log(JSON.stringify({samples:elevations.length,min:Math.min(...elevations),max:Math.max(...elevations),summit:elevation(0,(27.9881-center.latitude)*Math.PI/180*radius),eastFace:elevation(1600,750),valley:elevation(-2400,-3600),sources:sources.map(s=>s.imagerySources)},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
