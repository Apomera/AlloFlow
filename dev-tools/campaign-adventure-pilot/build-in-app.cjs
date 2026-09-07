const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const {root,build}=require('./build.cjs');
async function buildInApp(check=false){
  build(true);
  for(const [entry,relative] of [['in-app.mjs','stem_lab/stem_tool_fieldjourneys.js'],['sel-app.mjs','sel_hub/sel_tool_practicejourneys.js']]){
    const result=await esbuild.build({entryPoints:[path.join(__dirname,entry)],bundle:true,format:'iife',platform:'browser',target:['es2020'],loader:{'.css':'text'},write:false,
      banner:{js:'// Generated journey pilot. Run dev-tools/campaign-adventure-pilot/build-in-app.cjs.'}});
    const output=result.outputFiles[0].text;
    for(const name of [relative,'desktop/web-app/public/'+relative]){
      const file=path.join(root,name);
      if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==output)throw Error('Stale journey pilot: '+name);}
      else if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==output){fs.writeFileSync(file+'.pilot-next',output);fs.renameSync(file+'.pilot-next',file);}
    }
    console.log(relative+' '+(check?'verified':'built')+' ('+Buffer.byteLength(output)+' bytes).');
  }
}
if(require.main===module)buildInApp(process.argv.includes('--check')).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={buildInApp};
