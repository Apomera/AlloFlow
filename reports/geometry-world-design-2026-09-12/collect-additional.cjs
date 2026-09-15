const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
  const file=path.join(__dirname,'references.json'),items=JSON.parse(fs.readFileSync(file));
  for(const [slug,url,name] of [
    ['volume-world','https://aka.ms/VolumeWorld5','volume-world.mcworld'],
    ['geometry-points-lines-planes-support','https://education.minecraft.net/lessonsupportfiles/Geometry-Points-Lines-Planes.mcworld.zip','geometry-points-lines-planes-support.zip']
  ]){
    const item={slug,worldUrl:url};
    try{
      const r=await fetch(url,{signal:AbortSignal.timeout(90000)});
      item.resolvedUrl=r.url;
      if(!r.ok)throw Error('HTTP '+r.status);
      const parts=[];let size=0;
      for await(const p of r.body){size+=p.length;if(size>80*1024*1024)throw Error('Download limit exceeded');parts.push(p);}
      const bytes=Buffer.concat(parts);if(bytes.length<4||bytes.readUInt32LE(0)!==0x04034b50)throw Error('Response is not a ZIP world archive');
      item.localFile='reference-worlds/'+name;item.bytes=bytes.length;item.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
      fs.writeFileSync(path.join(__dirname,item.localFile),bytes);
    }catch(error){item.error=error.message;}
    items.push(item);console.log(JSON.stringify(item));
  }
  fs.writeFileSync(file,JSON.stringify(items,null,2));
})();
