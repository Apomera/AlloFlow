const fs=require('node:fs');
const path=require('node:path');
const esbuild=require('esbuild');
const {root,build,verifyPreservation}=require('./build.cjs');
async function buildInApp(check=false){
  build(true);
  const result=await esbuild.build({
    entryPoints:[path.join(__dirname,'in-app.mjs')],bundle:true,format:'iife',
    platform:'browser',target:['es2020'],loader:{'.css':'text'},write:false,
    banner:{js:'// Generated Field Journeys pilot. Run dev-tools/campaign-adventure-pilot/build-in-app.cjs.'}
  });
  const output=result.outputFiles[0].text;
  for(const name of ['stem_lab/stem_tool_fieldjourneys.js','desktop/web-app/public/stem_lab/stem_tool_fieldjourneys.js']){
    const file=path.join(root,name);
    if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==output)throw Error('Stale in-app pilot: '+name);}
    else if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==output){
      fs.writeFileSync(file+'.pilot-next',output);fs.renameSync(file+'.pilot-next',file);
    }
  }
  console.log('In-app Field Journeys bundle '+(check?'verified':'built')+' ('+Buffer.byteLength(output)+' bytes).');
}
if(require.main===module)buildInApp(process.argv.includes('--check')).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={buildInApp};
