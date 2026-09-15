const fs=require('node:fs'),assert=require('node:assert/strict');
const english=JSON.parse(fs.readFileSync(__dirname+'/english.json','utf8')),keys=Object.keys(english),table={};
for(const lang of ['french','spanish_latin_america','arabic']){
  const lines=fs.readFileSync(__dirname+'/'+lang+'.txt','utf8').trim().split(/\r?\n/);assert.equal(lines.length,keys.length,lang);
  const dict=table[lang]=Object.fromEntries(keys.map((key,i)=>[key,lines[i].trim()+(english[key].endsWith(' ')?' ':'')]));
  for(const prefix of ['','desktop/web-app/public/']){const file=prefix+'lang/'+lang+'.js',pack=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(pack.stem.anatomy,dict);fs.writeFileSync(file,JSON.stringify(pack,null,2)+'\n');}
}
fs.writeFileSync('dev-tools/i18n/handtl_anatomy_spotter_20260912.json',JSON.stringify(table,null,2)+'\n');
const file='dev-tools/i18n/stem_anatomy_en.json',registry=JSON.parse(fs.readFileSync(file,'utf8'));Object.assign(registry,english);fs.writeFileSync(file,JSON.stringify(registry,null,2)+'\n');console.log('Localized '+keys.length+' strings in six packs.');
