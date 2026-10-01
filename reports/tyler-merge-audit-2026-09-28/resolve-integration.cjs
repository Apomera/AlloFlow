const fs=require('fs'),path=require('path');
const ROOT='C:/tmp/tyler_integration_candidate';
const re=/^<<<<<<< CURRENT_MAIN\n([\s\S]*?)^\|\|\|\|\|\|\| COMMON_ANCESTOR\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>> TYLER_REVIEW\n?/gm;
let count=0;
const hostFile=path.join(ROOT,'AlloFlowANTI.txt');
let host=fs.readFileSync(hostFile,'utf8');
host=host.replace(re,(_,ours,base,theirs)=>{
 count++;
 if(ours.includes('useOwnSources, setUseOwnSources')){
  if(!ours.includes('documentsOnly, setDocumentsOnly')||!theirs.includes('guidedMode'))throw Error('Unexpected source prop conflict');
  return ours.replace('documentsOnly, setDocumentsOnly,','documentsOnly, setDocumentsOnly, guidedMode,');
 }
 const strip=s=>s.replace(/([?&]v=)[A-Za-z0-9.-]+/g,'$1VERSION');
 if(strip(ours)!==strip(base))throw Error('Loader conflict contains a non-version main change; inspect manually.');
 const versions=new Map([...ours.matchAll(/https:\/\/alloflow-cdn\.pages\.dev\/[^'"\s]+/g)].map(m=>[m[0].replace(/\?.*$/,''),m[0]]));
 return theirs.replace(/https:\/\/alloflow-cdn\.pages\.dev\/[^'"\s]+/g,url=>versions.get(url.replace(/\?.*$/,''))||url);
});
if(count!==3)throw Error('Expected three host conflicts, found '+count);
fs.writeFileSync(hostFile,host);
count=0;
const sidebarFile=path.join(ROOT,'view_sidebar_panels_source.jsx');
let sidebar=fs.readFileSync(sidebarFile,'utf8');
sidebar=sidebar.replace(re,(_,ours,base,theirs)=>{
 count++;
 if(ours.includes('useOwnSources, setUseOwnSources'))return ours+theirs;
 if(ours.includes('aria-label='))throw Error('Unexpected accessibility resolution');
 if(!base.includes('aria-label='))throw Error('Not an accessibility-label conflict');
 return theirs.replace(/^.*aria-label=.*\n/gm,'');
});
if(count!==16)throw Error('Expected sixteen sidebar conflicts, found '+count);
fs.writeFileSync(sidebarFile,sidebar);
for(const root of [ROOT,'C:/tmp/tyler_onboarding_review']){
 const file=path.join(root,'ui_strings.js');const before=fs.readFileSync(file,'utf8');const data=JSON.parse(before);
 data.roster.private_labels_storage_failed='AlloFlow could not save changes to this browser’s private labels. Free up browser storage or allow this site to store data, then try again. Your previous labels are unchanged.';
 const after=JSON.stringify(data,null,2)+'\n';
 fs.writeFileSync(file,after);
 fs.writeFileSync(path.join(root,'desktop/web-app/public/ui_strings.js'),after);
}
console.log('Resolved host loader versions, source-input props, and sidebar accessible-name/AI-gate unions; registered private-label storage error.');
