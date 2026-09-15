const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const old=cp.execFileSync('git',['show','HEAD:app_styles_source.jsx'],{encoding:'utf8',maxBuffer:5000000});
const current=fs.readFileSync('app_styles_source.jsx','utf8');const re=/<style data-docsuite-theme="v1">\{`([\s\S]*?)`\}<\/style>/;
const unchanged=old.match(re)?.[1]===current.match(re)?.[1];
const modules={};for(const f of ['view_simplified_module.js','app_styles_module.js']){const data=fs.readFileSync(f);if(!data.equals(fs.readFileSync('desktop/web-app/public/'+f)))throw Error('Mirror drift '+f);const hash=crypto.createHash('sha256').update(data).digest('hex').slice(0,8);if(!fs.readFileSync('AlloFlowANTI.txt','utf8').includes(f+'?v='+hash))throw Error('Stale pin '+f);modules[f]={hash,mirrorMatches:true,canonicalPinMatches:true};}
fs.writeFileSync('reports/adapted-text-themes-2026-09-12/build-verification.json',JSON.stringify({modules,sharedGeneratedThemeBlockUnchangedFromHead:unchanged},null,2));console.log(JSON.stringify({modules,sharedGeneratedThemeBlockUnchangedFromHead:unchanged}));
