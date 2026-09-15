const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const out=__dirname;
async function get(url,cap){
  const response=await fetch(url,{signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw Error('HTTP '+response.status+' for '+url);
  const parts=[];let length=0;
  for await(const part of response.body){length+=part.length;if(length>cap)throw Error('Reference exceeds download cap');parts.push(part);}
  return Buffer.concat(parts);
}
(async()=>{
  fs.mkdirSync(path.join(out,'reference-worlds'),{recursive:true});
  fs.mkdirSync(path.join(out,'reference-metadata'),{recursive:true});
  const references=[];
  for(const slug of ['geometry-world','volume-world','geometry-points-lines-planes','geometric-garden']){
    const item={slug,page:'https://education.minecraft.net/en-us/lessons/'+slug};
    try {
      const url='https://education.minecraft.net/bin/minecraft-edu/userDatabaseServlet.content.json?type=lesson&value='+slug+'&region=US&mode=';
      const raw=await get(url,2*1024*1024), data=JSON.parse(raw);
      fs.writeFileSync(path.join(out,'reference-metadata',slug+'.json'),raw);
      item.title=data.Title;item.metadataUrl=url;item.worldUrl=data.WorldFileName;
      item.supportingFiles=data.SupportingFiles;item.externalReferences=data.ExternalReferences;
      if(item.worldUrl){
        const bytes=await get(item.worldUrl,80*1024*1024);
        if(bytes.readUInt32LE(0)!==0x04034b50)throw Error('Download is not a ZIP world archive');
        item.localFile='reference-worlds/'+slug+'.mcworld';
        fs.writeFileSync(path.join(out,item.localFile),bytes);
        item.bytes=bytes.length;item.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
      }
    }catch(error){item.error=error.message;}
    references.push(item);console.log(JSON.stringify(item));
  }
  fs.writeFileSync(path.join(out,'references.json'),JSON.stringify(references,null,2));
  const source=fs.readFileSync('stem_lab/stem_tool_geometryworld.js','utf8').replace(/\r\n/g,'\n');
  const start=source.indexOf('var SAMPLE_LESSONS = '), end=source.indexOf('\n  };',start)+6;
  const lessons=vm.runInNewContext(source.slice(start,end)+';SAMPLE_LESSONS',{}, {timeout:3000});
  function questions(q){return !q?0:1+(q.followUp||[]).reduce((sum,q)=>sum+questions(q),0);}
  const inventory=Object.entries(lessons).map(([id,l])=>({id,title:l.title,ground:l.ground,objectives:l.objectives,structureInstructions:l.structures.length,npcs:l.npcs.length,questions:l.npcs.reduce((sum,n)=>sum+questions(n.question),0)}));
  fs.writeFileSync(path.join(out,'current-lessons.json'),JSON.stringify(inventory,null,2));
  console.log('Inventoried '+inventory.length+' current lessons.');
})();
