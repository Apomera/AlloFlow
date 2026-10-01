// Produces a reviewable host patch; never writes the shared host.
const fs=require('node:fs'),path=require('node:path'),{createPatch}=require('diff');
const root=path.resolve(__dirname,'../..');
function prepare(source){
 const marker='// Preserve explicit reading envelopes across local saves, including failed decodes.';
 if(source.includes(marker))return source;
 const old='                const serializedItem = {\n                    id: item.id || Date.now().toString(),';
 const next='                '+marker+'\n                const preserveReadingEnvelope = item.type === \'simplified\' && item.dataEncoding === \'json-text/v1\';\n'+old;
 if(source.split(old).length!==2)throw Error('Offline serializer anchor changed');
 let out=source.replace(old,next);
 const before='                    data: JSON.stringify(parsedData) || "{}",';
 if(out.split(before).length!==2)throw Error('Offline data anchor changed');
 out=out.replace(before,'                    data: preserveReadingEnvelope && typeof parsedData === \'string\' ? parsedData : JSON.stringify(parsedData) || "{}",');
 const encoding='                if (typeof parsedData === \'string\' && (item.type === \'simplified\' || item.dataEncoding === \'text/v1\')) serializedItem.dataEncoding = \'json-text/v1\';';
 if(out.split(encoding).length!==2)throw Error('Offline encoding anchor changed');
 return out.replace(encoding,'                if (preserveReadingEnvelope || (typeof parsedData === \'string\' && (item.type === \'simplified\' || item.dataEncoding === \'text/v1\'))) serializedItem.dataEncoding = \'json-text/v1\';');
}
module.exports={prepare};
if(require.main===module){const source=fs.readFileSync(path.join(root,'AlloFlowANTI.txt'),'utf8').replace(/\r\n/g,'\n'),candidate=prepare(source);if(candidate===source){console.log('Host preservation already integrated.');}else{fs.writeFileSync(path.join(__dirname,'hydration-host-integration.patch'),createPatch('AlloFlowANTI.txt',source,candidate));console.log('Prepared hydration-host-integration.patch without changing the host.');}}
