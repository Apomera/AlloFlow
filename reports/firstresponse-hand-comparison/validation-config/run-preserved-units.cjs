const {spawn}=require('node:child_process');
const path=require('node:path');
async function run(job){
 const child=spawn(process.execPath,[path.join(__dirname,'run-units.cjs'),job,'final'],{stdio:'inherit',windowsHide:true});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
 if(code!==0)throw Error('Preserved '+job+' checks failed, exit='+code);
}
(async()=>{await run('study');await run('hooks');})().catch(error=>{console.error(error);process.exitCode=1;});
