const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const acorn = require('acorn');
const { JSDOM } = require('jsdom');
const sourcePath = process.env.ALLO_SECURITY_ANALYTICS_PATH || 'student_analytics_module.js';
const source = fs.readFileSync(sourcePath, 'utf8');
const ast = acorn.parse(source, {ecmaVersion:'latest'});
const functions = new Map();
function walk(n) {
  if (!n?.type) return;
  if (n.type === 'FunctionDeclaration') functions.set(n.id.name, source.slice(n.start,n.end));
  if (n.type === 'VariableDeclarator' && n.init?.type === 'FunctionExpression') functions.set(n.id.name, 'var '+n.id.name+'='+source.slice(n.init.start,n.init.end)+';');
  for (const v of Object.values(n)) {if(Array.isArray(v))v.forEach(walk);else if(v?.type)walk(v);}
}
walk(ast);
const hostile = '</title><script>window.__auditExecuted=true</script><img data-audit-injected="yes" onerror="void(0)">';
function fixture(value) {
  let output='';
  const tier={tier:3,color:'#334155',bg:'#fff',border:'#000',emoji:'',label:value,reasons:[value]};
  const interp={statusColor:'#334155',status:value,interpretation:value,benchmark50:50,pctOfBenchmark:80,recommendations:[value]};
  const ctx={console,saAlloSheetScore:p=>p.score,saAlloSheetRecordMeasure:()=> 'orf',normTypeFor:t=>t,_seasonFromDate:()=> 'fall',getSeason:()=> 'fall',
    classifyRTITier:()=>tier,interpretProbeResult:()=>interp,generateStudentInsights:()=>({}),
    importedStudents:[{name:value,stats:{}}],probeHistory:{[value]:[{type:'orf',date:'2026-01-01',timestamp:1,score:40}]},
    interventionLogs:{[value]:[{program:value,frequency:value,minutes:value,startDate:value}]},
    window:{AlloModules:{DynamicAssessment:{_meta:{getSessionsByStudent:()=>[{domain:value,difficulty:value,modifiabilityIndex:1,modifiabilityTier:tier}]}}},open:()=>({document:{write:s=>{output=s},close(){}},print(){}})}};
  vm.createContext(ctx);
  for(const name of ['saEscapeReportText','printClinicalProbeReport','printMeetingSummary','printClassScreeningReport'])if(functions.has(name))vm.runInContext(functions.get(name),ctx);
  return {ctx,html:()=>output};
}
for (const name of ['printClinicalProbeReport','printMeetingSummary','printClassScreeningReport']) {
  test(name+' treats imported names and report fields as text',()=>{
    const h=fixture(hostile);
    if(name==='printClinicalProbeReport')h.ctx[name]('orf',{wcpm:hostile,wordsAttempted:hostile,errors:hostile},hostile,hostile,hostile);
    else h.ctx[name](hostile);
    const dom=new JSDOM(h.html(),{runScripts:'dangerously',url:'https://synthetic.invalid/'});
    try {
      assert.equal(dom.window.__auditExecuted,undefined);
      assert.equal(dom.window.document.querySelector('[data-audit-injected]'),null);
      assert.ok(dom.window.document.body.textContent.includes(hostile));
      assert.ok(dom.window.document.querySelector('table'));
    } finally {dom.window.close();}
  });
  test(name+' preserves ordinary text, scores and report structure',()=>{
    const value='Zoë & 李 <review> "quoted"';const h=fixture(value);
    if(name==='printClinicalProbeReport')h.ctx[name]('orf',{wcpm:40,wordsAttempted:45,errors:5},'3','A',value);else h.ctx[name](value);
    const dom=new JSDOM(h.html());
    try {assert.ok(dom.window.document.body.textContent.includes(value));assert.ok(dom.window.document.querySelectorAll('tr').length>1);assert.match(dom.window.document.body.textContent,/40/);} finally {dom.window.close();}
  });
}
test('unmatched file-import identity remains intact before safe rendering',async()=>{
  const ctx={_acIdentityLinkKey:async()=>''};vm.createContext(ctx);
  vm.runInContext(functions.get('_acCanonicalStudentName'),ctx);
  assert.equal(await ctx._acCanonicalStudentName(hostile,null,{}),hostile);
});
test('source/public delivery pair matches',()=>{
  if(process.env.ALLO_SECURITY_ANALYTICS_PATH)return;
  assert.deepEqual(fs.readFileSync('student_analytics_module.js'),fs.readFileSync('desktop/web-app/public/student_analytics_module.js'));
});
