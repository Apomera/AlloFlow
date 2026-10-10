const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_atctower.js'),'utf8');
new vm.Script(source,{filename:'stem_tool_atctower.js'});
assert.equal(source,fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_atctower.js'),'utf8'));
function namespace(file){const content=fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');const start=content.indexOf('    "atctower": {'),end=content.indexOf(',\n    "autorepair":',start);assert.ok(start>=0&&end>start);return JSON.parse('{'+content.slice(start,end).trim()+'}').atctower;}
const english=namespace('ui_strings.js');
assert.deepEqual(english,namespace('desktop/web-app/public/ui_strings.js'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'dev-tools/i18n/stem_atctower_en.json'),'utf8'));
assert.deepEqual(english,catalog.stem?.atctower||catalog.atctower||catalog);
const result={checkedAt:new Date().toISOString(),syntaxValid:true,toolMirrorsEqual:true,englishNamespacesEqual:true,developmentEnglishCatalogEqual:true,englishKeyCount:Object.keys(english).length,sourceSha256:crypto.createHash('sha256').update(source).digest('hex')};
fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
