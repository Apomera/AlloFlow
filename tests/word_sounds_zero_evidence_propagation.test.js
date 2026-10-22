import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require=createRequire(import.meta.url);
const React=require(resolve('desktop/web-app/node_modules/react'));
const ReactDOMServer=require(resolve('desktop/web-app/node_modules/react-dom/server'));
const analytics=readFileSync('student_analytics_module.js','utf8');
const phase=readFileSync('phase_k_helpers_source.jsx','utf8');
const section=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);if(a<0||b<0)throw Error(start);return source.slice(a,b);};
function insightEngine(snapshots) {
  return new Function('rosterKey','probeHistory','interventionLogs',section(analytics,'const computeCorrelation =','const generateClassInsights =')+';return {get:generateStudentInsights,DOMAIN_LABELS};')(
    {progressHistory:{Learner:snapshots}},{},{});
}
function insightMarkup(snapshots) {
  const engine=insightEngine(snapshots);
  const render=new Function('React','generateStudentInsights','DOMAIN_LABELS',section(analytics,'const renderInsightsPanel =','const renderClassInsights =')+';return renderInsightsPanel;')(
    React,engine.get,engine.DOMAIN_LABELS);
  return ReactDOMServer.renderToStaticMarkup(render('Learner'));
}
function downloadHarness() {
  const files=[];
  class MemoryBlob {constructor(parts){this.text=parts.join('');}}
  const URL={createObjectURL:blob=>{files.push(blob.text);return 'blob:unit-output';},revokeObjectURL:()=>{}};
  const document={createElement:()=>({click:()=>{}}),body:{appendChild:()=>{},removeChild:()=>{}}};
  return {files,Blob:MemoryBlob,URL,document};
}
const snap=(date,accuracy,attempts)=>({date,wsAccuracy:accuracy,wsGradedAttempts:attempts,quizAvg:80,totalActivities:4});

describe('Word Sounds missing evidence propagates through longitudinal outputs',()=>{
  it('keeps a missing endpoint null and excludes it from correlation pairs',()=>{
    const result=insightEngine([snap('2026-10-20',null,0),snap('2026-10-21',50,2)]).get('Learner');
    expect(result.growth.wsAccuracy).toBeNull();
    expect(result.growthTrajectory.map(item=>item.wsAccuracy)).toEqual([null,50]);
    expect(result.correlations.practiceToQuiz).toMatchObject({insufficient:true,n:1,r:null});
    const html=insightMarkup([snap('2026-10-20',null,0),snap('2026-10-21',50,2)]);
    expect(html).toContain('N/A');expect(html).not.toContain('+50%');
  });

  it('preserves genuine zero accuracy and growth while excluding an explicit zero-attempt snapshot',()=>{
    const result=insightEngine([snap('2026-10-19',0,2),snap('2026-10-20',100,0),snap('2026-10-21',0,3)]).get('Learner');
    expect(result.profile.phonologicalAwareness).toBe(0);expect(result.growth.wsAccuracy).toBe(0);
    expect(result.growthTrajectory.map(item=>item.wsAccuracy)).toEqual([0,null,0]);
    expect(result.correlations.practiceToQuiz.n).toBe(2);
    const html=insightMarkup([snap('2026-10-20',0,2),snap('2026-10-21',0,3)]);
    expect(html).toContain('0%');expect(html).not.toContain('N/A');
  });

  it('exports unknown Word Sounds profile/growth as blank CSV cells, retaining measured zero',async()=>{
    const memory=downloadHarness(),snapshots=[snap('2026-10-20',null,0),snap('2026-10-21',null,0)];
    const engine=insightEngine(snapshots);
    const run=new Function('askStudentAnalyticsConfirmation','importedStudents','generateStudentInsights','probeHistory','interventionLogs','rosterKey','externalCBMScores','Blob','URL','document','addToast','t',
      section(analytics,'const exportResearchCSV =','// ── Session-level CSV export')+';return exportResearchCSV;')(
      async()=>true,[{name:'Learner',stats:{}}],engine.get,{},{},{progressHistory:{Learner:snapshots}},{},memory.Blob,memory.URL,memory.document,null,key=>key);
    await run();
    const columns=memory.files[0].split('\n')[1].split(',');
    expect(columns[3]).toBe('""');expect(columns[6]).toBe('""');
    snapshots[0].wsAccuracy=0;snapshots[0].wsGradedAttempts=2;snapshots[1].wsAccuracy=0;snapshots[1].wsGradedAttempts=2;
    await run();const measured=memory.files[1].split('\n')[1].split(',');
    expect(measured[3]).toBe('"0"');expect(measured[6]).toBe('"0"');
  });
});

describe('learner HTML and live progress use the graded evidence denominator',()=>{
  const friendlyReport=data=>{
    const memory=downloadHarness();
    const report=new Function('t','_acWsSoundMastered','Blob','URL','document','setTimeout','addToast',
      section(analytics,'const generateStudentFriendlyReport =','// WCAG 2.1.2 / 4.1.2: focus save+restore')+';return generateStudentFriendlyReport;')(
      key=>key,()=>false,memory.Blob,memory.URL,memory.document,()=>{},null);
    report(data);return memory.files[0];
  };

  it('prints unavailable session history/growth without fabricating a zero baseline',()=>{
    const html=friendlyReport({wordSoundsHistory:[{activity:'letter_tracing',correct:true}],progressSnapshots:[snap('2026-10-20',null,0),snap('2026-10-21',50,2)]});
    const document=new DOMParser().parseFromString(html,'text/html');
    expect(document.querySelector('tbody tr td:nth-child(3)').textContent).toBe('N/A');
    expect(document.body.textContent).toContain('Graded results are needed at both time points.');
    expect(document.body.textContent).not.toContain('↑ +50%');
  });

  it('prints measured zero as zero and ignores ungraded unknown rows',()=>{
    const html=friendlyReport({wordSoundsHistory:[{activity:'counting',isCorrect:false},{activity:'counting'}],progressSnapshots:[snap('2026-10-20',0,2),snap('2026-10-21',0,3)]});
    const document=new DOMParser().parseFromString(html,'text/html');
    expect(document.querySelector('tbody tr td:nth-child(3)').textContent).toBe('0%');
    expect(document.body.textContent).not.toContain('Graded results are needed');
    expect(document.body.textContent).toContain('0%');
  });

  it.each([
    {history:[],expected:null,count:0},
    {history:[{activity:'letter_tracing',correct:true},{activity:'counting',practiceOnly:true,correct:true}],expected:null,count:0},
    {history:[{activity:'counting',correct:false},{activity:'counting',correct:false}],expected:0,count:2},
    {history:[{activity:'counting',isCorrect:true},{activity:'counting',correct:false},{activity:'letter_tracing',correct:true}],expected:50,count:2},
  ])('syncs graded count and nullable accuracy for $history',async({history,expected,count})=>{
    const sync=new Function(section(phase,'const syncProgressToFirestore =','const buildStudentProgressSummary =')+';return syncProgressToFirestore;')();
    const write=vi.fn(),warn=vi.fn();
    await sync({isCanvas:false,activeSessionCode:'unit-session',studentNickname:'Learner',history:[],wordSoundsHistory:history,wordSoundsScore:{total:0,correct:0},
      studentResponses:{},focusData:{},gameCompletions:[],labelChallengeResults:[],pasteEvents:[],socraticChatHistory:[],aiSafetyFlags:[],getFocusRatio:()=>null,
      SafetyContentChecker:{check:()=>[]},doc:()=>({}),setDoc:write,setIsProgressSyncing:()=>{},setLastProgressSync:()=>{},debugLog:()=>{},warnLog:warn});
    expect(warn).not.toHaveBeenCalled();expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][1].stats).toMatchObject({wsAccuracy:expected,wsGradedAttempts:count});
  });
});
