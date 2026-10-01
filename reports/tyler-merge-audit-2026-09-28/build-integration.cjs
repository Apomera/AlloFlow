const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const ROOT='C:/tmp/tyler_integration_candidate';
const names=['onboarding_coach','teacher','ui_modals','view_educator_hub_modal','view_fab_stack','view_guided_mode_banner','view_header','view_history_panel','view_launch_pad','view_learning_hub_modal','view_sidebar_panels','view_sidebar_tabs_nav','view_teacher_history_tab'];
for(const f of ['AlloFlowANTI.txt',...names.map(n=>n+'_source.jsx')]){
 if(/^<<<<<<< |^>>>>>>> |^=======\s*$/m.test(fs.readFileSync(path.join(ROOT,f),'utf8')))throw Error('Unresolved source: '+f);
}
const log=path.join(__dirname,'integration-build.log');fs.writeFileSync(log,'');
function run(args){
 const r=cp.spawnSync(process.execPath,args,{cwd:ROOT,encoding:'utf8',maxBuffer:20*1024*1024});
 fs.appendFileSync(log,'\n$ node '+args.join(' ')+'\n'+(r.stdout||'')+(r.stderr||''));
 if(r.status!==0)throw Error('Build failed: '+args.join(' ')+'\n'+(r.stderr||r.stdout||'').slice(-5000));
 console.log('PASS '+args.join(' '));
}
for(const n of names){run(['_build_'+n+'_module.js']);fs.copyFileSync(path.join(ROOT,n+'_module.js'),path.join(ROOT,'desktop/web-app/public',n+'_module.js'));}
run(['_build_classroom_import.js']);
for(const p of ['ui_strings.js','help_strings.js','onboarding_helpers_module.js'])fs.copyFileSync(path.join(ROOT,p),path.join(ROOT,'desktop/web-app/public',p));
const receipt=JSON.parse(fs.readFileSync(path.join(__dirname,'integration-merge.json'),'utf8'));
for(const {path:p} of receipt.results.filter(x=>x.path.startsWith('lang/')))fs.copyFileSync(path.join(ROOT,p),path.join(ROOT,'desktop/web-app/public',p));
run(['build.js','--mode=dev','--shell-only']);
const parser=require(path.join(ROOT,'node_modules/@babel/parser'));
for(const p of ['AlloFlowANTI.txt','desktop/web-app/src/App.jsx'])parser.parse(fs.readFileSync(path.join(ROOT,p),'utf8'),{sourceType:'module',plugins:['jsx']});
const pairs=[...names.map(n=>n+'_module.js'),'ui_strings.js','help_strings.js','onboarding_helpers_module.js','classroom-import.html','classroom_import_app.js','classroom_import_service.js'];
const results=pairs.map(p=>{
 const a=fs.readFileSync(path.join(ROOT,p)),b=fs.readFileSync(path.join(ROOT,'desktop/web-app/public',p));
 if(!a.equals(b))throw Error('Mirror differs: '+p);
 return {path:p,sha256:crypto.createHash('sha256').update(a).digest('hex')};
});
fs.writeFileSync(path.join(__dirname,'integration-build.json'),JSON.stringify({at:new Date().toISOString(),root:ROOT,jsxParsed:true,pairs:results},null,2)+'\n');
console.log('PASS host JSX parsing and '+pairs.length+' source/public artifact pairs.');
