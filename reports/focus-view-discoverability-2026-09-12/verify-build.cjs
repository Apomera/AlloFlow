const fs=require('fs'),crypto=require('crypto'),parser=require('@babel/parser');
const report='reports/focus-view-discoverability-2026-09-12';
const canonical=fs.readFileSync('AlloFlowANTI.txt','utf8'),modules={};
for(const name of ['view_simplified_module.js','app_styles_module.js','allo_commands_module.js']){
 const bytes=fs.readFileSync(name);if(!bytes.equals(fs.readFileSync('desktop/web-app/public/'+name)))throw Error('Mirror drift '+name);
 const hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,8);if(!canonical.includes(name+'?v='+hash))throw Error('Pin drift '+name);modules[name]={hash,mirrorMatches:true,canonicalPinMatches:true};
}
if(!fs.readFileSync('ui_strings.js').equals(fs.readFileSync('desktop/web-app/public/ui_strings.js')))throw Error('Catalog mirror drift');
const hosts=[];
for(const file of ['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx']){
 const source=fs.readFileSync(file,'utf8');parser.parse(source,{sourceType:'unambiguous',plugins:['jsx']});
 if(source.split('onFocusViewChange: setIsZenMode').length!==2)throw Error('Focus integration '+file);
 const start=source.indexOf('          {isZenMode && (');const end=source.indexOf('          {isSyncMode && (',start);const exit=source.slice(start,end);
 if(!exit.includes('self-end shrink-0')||exit.includes('absolute')||!exit.includes("aria-label={t('common.exit_focus')}"))throw Error('Exit control '+file);
 hosts.push({file,jsxParses:true,focusHandlerWired:true,exitInFlow:true});
}
const result={modules,hosts,catalogMirrorMatches:true};fs.writeFileSync(report+'/build-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
