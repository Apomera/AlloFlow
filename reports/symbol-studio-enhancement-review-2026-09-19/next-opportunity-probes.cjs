const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'symbol_studio_module.js'),'utf8');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start);return source.slice(a,b);}
const scope={uid:()=> 'fixture-id',console,profiles:[{id:'test',codename:'Demo'}],activeProfileId:'test',activeGoals:[],profileWishes:[],
  gallery:[],savedBoards:[],savedSchedules:[],boardWords:[],schedItems:[],storyPages:[],cmItems:[],snItems:[],amItems:[],bcItems:[],twItems:[],cbItems:[],
  boardTitle:'',schedTitle:'',ftFirstLabel:'',ftThenLabel:'',usageLog:{},familiarity:{},CORE_SET:{},getWordFunction:()=>null,
  t:x=>x,addToast:()=>{},document:{createElement:()=>({click(){}}),body:{appendChild(){},removeChild(){}}},URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}},
  Blob:class{constructor(parts){scope.csv=parts.join('');}}
};
vm.createContext(scope);
vm.runInContext(section('  function normalizeSymbolLabel(value) {','  function loadScopedBank(pid) {'),scope);
scope.getFamiliarityScore=label=>scope.symbolPracticeScore(scope.symbolFamiliarityEntry(scope.familiarity,label));
vm.runInContext(section('    function computeWordBank() {','    var generateGardenStory ='),scope);
vm.runInContext(section('    function exportGardenCSV(bank) {','    // ── Quick Boards tab'),scope);
const image='data:image/png;base64,AA==';
const candidates=[{id:'approved',label:'Water',image,reviewStatus:'approved'},{id:'preferred-needs-changes',label:'Water',image,isPreferred:true,reviewStatus:'needs_changes'}];
const selected=scope.findExactBankAsset(candidates,'Water');
assert.equal(selected.id,'preferred-needs-changes');
scope.gallery=[{id:'apple',label:'Apple',image}];scope.boardWords=[{label:'Apple'}];scope.storyPages=[{text:'Apple is here.'}];
const unpracticed=scope.computeWordBank()[0];assert.equal(unpracticed.growth,'growing');assert.equal(unpracticed.taps,0);
scope.boardWords=[];scope.storyPages=[];scope.gallery=[{id:'nfc',label:'Café',image},{id:'nfd',label:'Cafe\u0301',image}];
scope.familiarity={'café':{taps:19,lastSeen:Date.now()}};
const unicode=scope.computeWordBank();assert.equal(unicode.length,2);assert.equal(scope.normalizeSymbolLabel(unicode[0].displayLabel),scope.normalizeSymbolLabel(unicode[1].displayLabel));
const comparison=source.match(/var correct = (questInput\.trim\(\)\.toLowerCase\(\) === questTarget\.label\.trim\(\)\.toLowerCase\(\));/)[1];
const spelling=new Function('questInput','questTarget','return '+comparison);
assert.equal(spelling('Cafe\u0301',{label:'Café'}),false);
const entries=[{label:'I'},{label:'want'},{label:'Water'},{label:'__UTTERANCE__',length:2}];
scope.usageLog={test:{sessions:[{entries}]}};scope.exportGardenCSV([]);
const rows=scope.csv.split('\n');const at=rows.indexOf('--- AGGREGATE METRICS ---');const headers=rows[at+1].split(',');const values=rows[at+2].split(',');
const metrics=Object.fromEntries(headers.map((h,i)=>[h,values[i]]));assert.equal(metrics.total_utterances,'3');assert.equal(metrics.mean_symbols_per_message,'3.00');
const debriefMean=entries.filter(e=>e.label==='__UTTERANCE__').reduce((n,e)=>n+e.length,0)/entries.filter(e=>e.label==='__UTTERANCE__').length;
const output={sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),scope:'Analysis-only execution of extracted current-source functions with synthetic state; no production storage or application source changes.',
  automaticReuse:{chosen:selected.id,status:selected.reviewStatus,approvedAlternativeAvailable:true},
  resourceGrowthWithoutPractice:{contexts:unpracticed.uniqueContextCount,taps:unpracticed.taps,score:unpracticed.famScore,growth:unpracticed.growth},
  unicodeGarden:unicode.map(w=>({label:w.displayLabel,key:w.key,score:w.famScore,reportedTaps:w.taps})),
  unicodeSpelling:{displayLabel:'Café',input:'Cafe\u0301',canonicallyEquivalent:true,accepted:spelling('Cafe\u0301',{label:'Café'})},
  storySegmentation:{text:'我喝水。',label:'水',found:scope.storyIncludesSymbol('我喝水。','水')},
  messageMetrics:{tapEvents:3,messageEvents:1,recordedMessageLength:2,debriefMean,csvTotalUtterances:metrics.total_utterances,csvUniqueUtterances:metrics.unique_utterances,csvMeanSymbolsPerMessage:metrics.mean_symbols_per_message},
  downloadAllScheduling:{formula:'one anchor click per asset at i * 250 ms',library1000:{downloads:1000,lastScheduledAfterSeconds:999*250/1000}}
};
fs.writeFileSync(path.join(__dirname,'next-opportunity-probes.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
