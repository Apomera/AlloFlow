const fs=require('node:fs'),path=require('node:path');
for(const file of ['audit-route-v2.json','source-audit-final.json','native-v2-report/check.json','native-v2-report/visibility-audit.json']){
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,file)));const out={file,keys:Object.keys(data)};
 for(const [key,value]of Object.entries(data))if(!['captures','catalogs','resources','matrix','models','comparisons','newRoute','newRouteVariation','stability','routes','unchanged','records','poses','oldRoutePoses','testedPoses'].includes(key)&&JSON.stringify(value).length<7000)out[key]=value;
 if(data.resources)out.resources=data.resources.map(r=>({phase:r.phase,createdBuffers:r.createdBuffers,deletedBuffers:r.deletedBuffers,createdTextures:r.createdTextures,deletedTextures:r.deletedTextures,createdPrograms:r.createdPrograms,deletedPrograms:r.deletedPrograms,createdShaders:r.createdShaders,deletedShaders:r.deletedShaders,error:r.error,lost:r.lost,finiteUploads:r.finiteUploads}));
 if(data.captures)out.captures=data.captures.map(c=>({file:c.file,hash:c.hash,glError:c.glError,statistics:c.statistics}));console.log(JSON.stringify(out,null,2));
}
