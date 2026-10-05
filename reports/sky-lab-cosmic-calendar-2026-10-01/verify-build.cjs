const fs=require('fs'),crypto=require('crypto'),out='reports/sky-lab-cosmic-calendar-2026-10-01';
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const source=read('stem_lab/stem_tool_astronomy.js'),base=read(out+'/source-before.js');
let restored=source;
for(const p of['model-insertion.js','helper-insertion.js']) {
 const piece=read(out+'/'+p);if(restored.split(piece).length!==2)throw Error('Insertion not unique: '+p);
 restored=restored.replace(piece,'');
}
restored=restored.replace('      cosmicCalendarModel: cosmicCalendarModel, cosmicCalendarPosition: cosmicCalendarPosition, galaxyRotationModel: galaxyRotationModel,','      galaxyRotationModel: galaxyRotationModel,')
 .replace(read(out+'/calendar-after.js'),read(out+'/calendar-before.js'));
if(restored!==base)throw Error('Edits beyond the owned Calendar scope');
if(source!==read('desktop/web-app/public/stem_lab/stem_tool_astronomy.js'))throw Error('Source mirror differs');
new Function(source);
const tests=read('tests/astronomy_ui_resilience.test.js'),oldTests=read(out+'/ui-resilience-before.js');
const block=t=>t.slice(t.indexOf("describe('Astronomy Cosmic Calendar resilience'"),t.indexOf("describe('Astronomy Messier catalog resilience'"));
if(tests.replace(block(tests),block(oldTests))!==oldTests)throw Error('Resilience edits exceeded the Calendar block');
const delta=JSON.parse(read(out+'/english-labels.json'));
for(const path of['ui_strings.js','desktop/web-app/public/ui_strings.js']){
 const a=JSON.parse(read(path)).stem.astronomy;
 for(const[k,v]of Object.entries(delta))if(a[k]!==v)throw Error('English label differs: '+k);
}
const result={sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),baselineSha256:crypto.createHash('sha256').update(base).digest('hex'),
 sourceMatchesMirror:true,scopeReconstructsBaseline:true,syntaxValid:true,ownedEnglishLabels:Object.keys(delta).length,resilienceEditsConfinedToCalendar:true,committed:false};
fs.writeFileSync(out+'/scope-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
