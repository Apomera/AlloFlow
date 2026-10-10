const fs=require('node:fs'),path=require('node:path');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',dir=path.join(repo,'reports/cephalopod-hunter-enhancement/pass-fifty-four');process.chdir(repo);
const temp=path.join(__dirname,'pass54-preview-temp');fs.mkdirSync(temp,{recursive:true});process.env.TMP=temp;process.env.TEMP=temp;
const {GlHarness}=require(path.join(dir,'preview-harness.generated.cjs'));
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1100,height:1000,layout:'document',probes:`window.addEventListener('load',function(){var params=new URLSearchParams(location.search);var wrap=document.getElementById('wrap');if(wrap)wrap.style.width='100%';window.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:params.has('species'),huntSpeciesId:params.get('species')||'commonOcto',huntMode:params.get('mode')||'reefMission',huntSeed:2741,_threeLoaded:true}});});`});
harness.start().then(()=>{fs.writeFileSync(path.join(dir,'preview-url.txt'),harness.url+'/__harness');fs.writeFileSync(path.join(dir,'preview-pid.txt'),String(process.pid));fs.appendFileSync(path.join(dir,'preview-server.log'),'Ready '+harness.url+' PID '+process.pid+'\n');console.log(JSON.stringify({origin:harness.url,pid:process.pid}));}).catch(e=>{fs.appendFileSync(path.join(dir,'preview-server.log'),e.stack+'\n');console.error(e);clearInterval(keepAlive);process.exit(1);});
process.on('SIGINT',()=>harness.stop().then(()=>process.exit()));
const keepAlive=setInterval(()=>{},30000);
