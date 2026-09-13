#!/usr/bin/env node
// Bounded provider evaluation using production prompts and fictional learner work.
// Credentials stay in the existing provider adapter. Never load real class data.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const pilot = require('./run_text_complexity_live_pilot.cjs');
const ROOT = path.resolve(__dirname, '..');
const families = ['investigate', 'design', 'decide', 'propose', 'explore'];
const sources = [
  'Water can soak into soil. Water that does not soak in can run downhill. Different soils may let water through at different rates.',
  'An insulating material slows heat transfer. The lesson does not compare specific brands or provide temperature measurements.',
  'Evaporation changes liquid water to water vapor. Runoff carries water across the ground. The school has not measured its garden soil or water use.',
  'Reusing an item can reduce the need to make a new one. A plan needs people, materials, and time. This excerpt gives no prices, demand estimates, or costs.',
  'Fairness can mean equal shares or meeting different needs. These principles can lead to different choices. Reasons and counterexamples help us examine each principle.',
];
const grades = ['3rd Grade', '5th Grade', '8th Grade', '10th Grade', '12th Grade'];
function loadChallenge() {
  const window = { React: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'applied_challenge_module.js'), 'utf8'), { window, console, URL, Date, setTimeout, clearTimeout });
  return window;
}
function productionGeneration() {
  const source = fs.readFileSync(path.join(ROOT, 'generate_dispatcher_source.jsx'), 'utf8');
  const marker = "} else if (type === 'applied-challenge') {";
  const start = source.indexOf(marker), end = source.indexOf("} else if (type === 'memory-aid') {", start);
  if (start < 0 || end < 0) throw Error('Production generation branch missing');
  return new (Object.getPrototypeOf(async function(){}).constructor)('deps', 'window', `const {setIsProcessing,setActiveView,switchView,generatedContent,_isolatedContext,configOverride,appliedChallengeSelectionMode,appliedChallengeFamily,appliedChallengeAgencyMode,appliedChallengeScope,appliedChallengeCustomInstructions,appliedChallengePlan,usesLocalTextBackend,localExcerpt,textToProcess,effectiveGrade,effectiveLanguage,sourceTopic,languageDirective,standardsDirective,interestsDirective,dokDirective,effCustomInstructions,callGemini,setGenerationTaskProgress,parseJsonLenient,cleanJson,warnLog}=deps;let content,metaInfo;${source.slice(start + marker.length, end)};return {content,metaInfo};`);
}
function parseJson(text) {
  if (typeof text !== 'string') return text;
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(clean);
}
function seed(index) {
  return { title: 'Fictional classroom ' + families[index] + ' challenge', family: families[index], scope: 'compact', agencyMode: 'progressive', sourceExcerpt: sources[index], lessonRef: {gradeLevel: grades[index]}, plan: {learningTarget: 'Use the supplied lesson concept to justify a choice.', availableTime: '20 minutes', materials: 'Paper, pencil, and the lesson text. Plan a check; do not conduct an experiment.'}, brief: {context: 'A fictional classroom task with no local measurements.', drivingQuestion: 'Which approach is defensible, and what evidence might change your reasoning?', seedDirection: 'Use the lesson idea to compare approaches.', lockedLessonFacts: sources[index].split('. ').slice(0,2).map(text=>text.replace(/\.$/,'')+'.'), factSources: sources[index].split('. ').slice(0,2).map(text=>({text:text.replace(/\.$/,'')+'.',sourceQuote:text.replace(/\.$/,'')+'.'})), criteria: ['Explain a lesson connection.', 'Compare two options and a tradeoff.'], constraints: ['No invented measurements, prices, or results.'], deliverable: 'A reasoned response and a proposed check.'}, supports: {frameStarter: 'How could we ___?', parallelExample: {context: 'Organizing a library shelf', move: 'Compare two approaches using the same criterion.', whyItHelps: 'The tradeoff becomes visible.'}}, workspace: {} };
}
function generationDeps(index, callGemini) {
  const noop = () => {}, data = seed(index);
  return {setIsProcessing:noop,setActiveView:noop,switchView:false,generatedContent:null,_isolatedContext:false,configOverride:{},appliedChallengeSelectionMode:'manual',appliedChallengeFamily:families[index],appliedChallengeAgencyMode:index===4?'student-framed':'progressive',appliedChallengeScope:'compact',appliedChallengeCustomInstructions:'',appliedChallengePlan:{...data.plan,sourceSelection:sources[index],supportLevel:index===0?'example':'independent'},usesLocalTextBackend:false,localExcerpt:(s,n)=>s.slice(0,n),textToProcess:sources[index],effectiveGrade:grades[index],effectiveLanguage:'English',sourceTopic:'Fictional classroom application',languageDirective:'Write in English.',standardsDirective:'',interestsDirective:'',dokDirective:'',effCustomInstructions:'',callGemini,setGenerationTaskProgress:noop,parseJsonLenient:parseJson,cleanJson:x=>x,warnLog:noop};
}
const feedbackSpecs = [
  {id:'planned-check-is-not-a-result',index:0,response:'I would compare how much water passes through two soil samples using the same amount of water. I have not tried it yet.',checks:[{id:'planned',source:'self',plan:{testQuestion:'Compare equal soil amounts with equal water.'},observation:{evidence:''},decision:{action:'pending',reasoning:''}}],review:['Does feedback preserve the difference between a planned investigation and a completed result?','Is the next step specific and age appropriate?']},
  {id:'link-only-work-is-not-inspected',index:1,response:'',artifact:'https://example.org/fictional-insulation-sketch',description:'My sketch compares a paper sleeve and a cloth sleeve. I have not measured the temperature.',review:['Does feedback discuss only the supplied explanation?','Does it avoid claiming to have viewed the sketch or inventing results?']},
  {id:'later-evidence-changes-recommendation',index:2,response:'I prefer watering more slowly because the lesson says water can run off before it soaks in. I need a local check.',late:true,review:['Does the review notice the conflicting sixth evidence row?','Does it identify a useful verification step instead of generic praise?']},
  {id:'unsupported-budget-and-demand',index:3,response:'My refill plan will cost exactly $40 and everyone will buy it. I have not found prices or asked anyone.',review:['Does feedback identify the unsupported cost and demand?','Does it avoid inventing replacement numbers or writing a completed proposal?']},
  {id:'values-and-counterexample',index:4,response:'Equal shares is a clear starting rule, but a person with greater need may require more. We should discuss which needs matter. An equal split can still leave someone without enough.',review:['Does feedback assess reasons and the alternative rather than grade the learner’s values?','Does it offer one actionable question without replacing the position?']},
];
async function buildPlan() {
  const window = loadChallenge(), challenge = window.AlloModules.AppliedChallenge, execute = productionGeneration();
  const cases = [];
  for (let index=0; index<5; index++) {
    let prompt;
    await execute(generationDeps(index, async value => { if (!prompt) prompt=value; return JSON.stringify(seed(index)); }), window);
    cases.push({id:'generate-'+families[index],kind:'generation',index,grade:grades[index],prompt,review:['Must require a specific idea from the provided lesson.','Must allow meaningful alternatives with a tradeoff.','Must fit 20 minutes and stated materials; proposed checks are not completed experiments.','Must preserve unsupplied measurements, prices, and local conditions as unknown.','Language and support must fit the target grade.']});
  }
  for (const spec of feedbackSpecs) {
    const data=seed(spec.index);
    data.brief.factVerified = spec.id==='values-and-counterexample';
    data.workspace={workingQuestion:data.brief.drivingQuestion,response:spec.response,artifactUrl:spec.artifact||'',artifactDescription:spec.description||''};
    if(spec.checks) data.validationCycles=spec.checks;
    if(spec.late) data.evidenceLedger=Array.from({length:6},(_,i)=>({id:'evidence-'+i,claim:i===5?'Slower watering may still run off on compacted soil.':'Consider a different watering schedule.',evidence:i===5?'Outside-source note: our soil condition remains unmeasured; this could change the recommendation.':'The lesson says water can soak into soil.',status:'needs-check'}));
    cases.push({id:spec.id,kind:'feedback',index:spec.index,grade:grades[spec.index],prompt:challenge._testing.buildAppliedChallengeFeedbackPrompt(data),review:spec.review});
  }
  return cases;
}
async function run(args=process.argv.slice(2), env=process.env) {
  const config=pilot.parseArgs(args);
  config.maxCalls=Math.min(12,config.maxCalls||12);
  // The inherited pilot defaults to 3 calls; this matrix explicitly budgets 12.
  if(!args.includes('--max-calls')) config.maxCalls=12;
  config.maxRetries=1;
  config.maxHttpAttempts=config.maxCalls;
  const cases=await buildPlan();
  const readiness=pilot.providerReadiness(config,env);
  const report={version:1,createdAt:new Date().toISOString(),syntheticOnly:true,mode:config.execute?'live':'dry-run',status:config.execute&&!readiness.ready?'blocked':'prepared',provider:{backend:config.backend,model:config.model},readiness,budget:{maximumLogicalCalls:config.maxCalls,maximumHttpAttempts:config.maxCalls,usedLogicalCalls:0},cases:cases.map(c=>({...c,status:'not-run',humanReview:'pending'})),limitations:['A finite synthetic sample cannot establish classroom usability or learning gains.','Structural checks are not a judgment of educational quality.','Generation uses the production branch; provider transport is the existing CLI adapter, which uses text mode with the production JSON instruction rather than the app’s JSON-mode setting.']};
  if(config.execute&&readiness.ready){
    const telemetry=[], budget={used:0,maximum:config.maxCalls};
    const generate=pilot.createProviderGenerator(config,telemetry,env,budget);
    const window=loadChallenge(), execute=productionGeneration();
    for(const item of report.cases){
      item.attempts=[];
      try{
        const call=async prompt=>{
          if(report.budget.usedLogicalCalls>=config.maxCalls) throw Error('call-budget-exhausted');
          report.budget.usedLogicalCalls++;
          const result=await generate({prompt});
          item.attempts.push({prompt,text:result.text,requestedModel:result.requestedModel,servedModel:result.servedModel});
          return result.text;
        };
        if(item.kind==='generation'){
          const result=await execute(generationDeps(item.index,call),window);
          item.normalized=result.content;
          item.structuralChecks={generationIssues:window.AlloModules.AppliedChallenge.generationIssues(result.content),learnerResponseBlank:result.content.workspace.response===''};
        }else item.response=parseJson(await call(item.prompt));
        item.status='received';
      }catch(error){item.status='failed';item.failure=error.message==='call-budget-exhausted'?'call-budget-exhausted':'provider-or-structure-failure';}
    }
    report.budget.usedHttpAttempts=budget.used;
    report.status=report.cases.every(c=>c.status==='received')?'awaiting-human-review':'partial';
  }
  const output=path.resolve(config.output||path.join(ROOT,'reports/applied-problem-solving-review-2026-09-12/live-ai-evaluation.json'));
  const relative=path.relative(ROOT,output);
  if(relative.startsWith('..')||path.isAbsolute(relative)) throw Error('Output must stay in this workspace');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  return report;
}
module.exports={buildPlan,run,productionGeneration,generationDeps};
if(require.main===module)run().then(report=>{console.log(JSON.stringify({status:report.status,cases:report.cases.length,readiness:report.readiness,usedCalls:report.budget.usedLogicalCalls}));if(report.status==='blocked')process.exitCode=2;}).catch(()=>{console.error('Applied challenge evaluation failed before completion. No credentials are logged.');process.exitCode=1;});
