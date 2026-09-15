const fs=require('fs');const dir='reports/anatomy-integrated-refinements-2026-09-12/';const english=Object.assign({},...['core','learning','finish'].map(n=>JSON.parse(fs.readFileSync(dir+'strings-'+n+'.json','utf8'))));const translated=JSON.parse(fs.readFileSync(dir+'translations.json','utf8'));const hand={};
for(const [lang,entries]of Object.entries(translated)){
 const keys=Object.fromEntries(Object.entries(entries).map(([k,v])=>['ref2_'+k,v]));for(const key of Object.keys(english))if(!keys[key])throw Error(lang+' missing '+key);
 for(const [key,value]of Object.entries(keys)){if(!english[key])throw Error('Unknown '+key);const tokens=x=>(x.match(/\{\w+\}/g)||[]).sort().join('|');if(tokens(value)!==tokens(english[key]))throw Error('Placeholder mismatch '+key);}
 hand[lang]=keys;for(const prefix of ['','desktop/web-app/public/']){const file=prefix+'lang/'+lang+'.js';const pack=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(pack.stem.anatomy,keys);fs.writeFileSync(file,JSON.stringify(pack,null,2)+'\n');}
}
fs.writeFileSync('dev-tools/i18n/handtl_anatomy_integrated_20260912.json',JSON.stringify(hand,null,2)+'\n');fs.writeFileSync(dir+'strings-english.json',JSON.stringify(english,null,2)+'\n');console.log(JSON.stringify({keys:Object.keys(english).length,languages:Object.keys(hand),packs:6}));
