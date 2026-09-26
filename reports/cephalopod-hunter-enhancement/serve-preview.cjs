const fs=require('fs'),path=require('path'),esbuild=require('esbuild');
const generated=path.join(__dirname,'harness.generated.cjs');esbuild.buildSync({entryPoints:['tests/e2e/helpers/stem_gl_harness.ts'],bundle:true,platform:'node',format:'cjs',outfile:generated,external:['@playwright/test']});
const {GlHarness}=require(generated);
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1100,height:1000,layout:'document',probes:`window.addEventListener('load',function(){var params=new URLSearchParams(location.search);window.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:params.has('species'),huntSpeciesId:params.get('species')||'commonOcto',huntMode:params.get('mode')||'reefMission',huntSeed:2741,_threeLoaded:true}});});`});
harness.start().then(()=>{fs.writeFileSync(path.join(__dirname,'preview-url.txt'),harness.url+'/__harness');console.log(harness.url+'/__harness');});
process.on('SIGINT',()=>harness.stop().then(()=>process.exit()));
