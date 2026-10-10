const fs=require('fs'),path=require('path'),crypto=require('crypto'),moduleApi=require('node:module');
if(typeof moduleApi.registerHooks!=='function')throw Error('This Node runtime has no synchronous loader hooks');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',target=path.join(repo,'node_modules/vitest/dist/chunks/cli-api.Cjt90eJu.js');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),physicalPin=hash(fs.readFileSync(target));
moduleApi.registerHooks({load(url,context,nextLoad){
  const loaded=nextLoad(url,context);if(!url.endsWith('/cli-api.Cjt90eJu.js'))return loaded;
  if(hash(fs.readFileSync(target))!==physicalPin)throw Error('Installed Vitest source drift');
  let text=typeof loaded.source==='string'?loaded.source:Buffer.from(loaded.source).toString();
  const edits=[['const START_TIMEOUT = 6e4;','const START_TIMEOUT = 18e4;'],['const WORKER_START_TIMEOUT = 9e4;','const WORKER_START_TIMEOUT = 21e4;']];
  const before=text;for(const [a,b]of edits){if(text.split(a).length!==2)throw Error('Unsupported installed startup declaration '+a);text=text.replace(a,()=>b);}
  if(process.env.DISSECTION_POOL_GRACE_LOG)fs.appendFileSync(process.env.DISSECTION_POOL_GRACE_LOG,JSON.stringify({at:new Date().toISOString(),pid:process.pid,installedSha256:physicalPin,originalLoadedSha256:hash(before),inMemorySha256:hash(text),edits,onlyStartupDeadlinesChanged:true})+'\n');
  return {...loaded,source:text};
}});
