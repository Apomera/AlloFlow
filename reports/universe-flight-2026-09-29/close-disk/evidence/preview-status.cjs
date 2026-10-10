const crypto=require('node:crypto');
async function main(){
const result=[];
for(const file of ['reports/universe-flight-2026-09-29/preview.html','stem_lab/universe_flight_scene.js','stem_lab/stem_tool_universe.js']){
 try{const response=await fetch('http://127.0.0.1:3187/'+file,{signal:AbortSignal.timeout(5000)});const bytes=Buffer.from(await response.arrayBuffer());result.push({file,status:response.status,hash:crypto.createHash('sha256').update(bytes).digest('hex')});}
 catch(error){result.push({file,error:String(error)});}
}
console.log(JSON.stringify(result));}
main().catch(error=>{console.error(error);process.exitCode=1;});
