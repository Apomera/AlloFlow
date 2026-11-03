import {beforeAll,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url),parser=require('@babel/parser');
const propertyKey=property=>property?.key?.name||property?.key?.value;
function findOne(source,predicate){
 const matches=[];
 function walk(node){if(!node||typeof node!=='object')return;if(node.type&&predicate(node))matches.push(node);for(const[key,value]of Object.entries(node)){if(['start','end','loc','extra','comments','tokens'].includes(key))continue;if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}}
 walk(parser.parse(source,{sourceType:'unambiguous',plugins:['jsx']}));
 if(matches.length!==1)throw Error('Expected one source-idea adapter anchor, found '+matches.length);
 return matches[0];
}
function inspectAdapter(source){
 const props=findOne(source,node=>node.type==='ObjectExpression'&&node.properties.some(property=>propertyKey(property)==='onGenerateFromIdea')&&node.properties.some(property=>propertyKey(property)==='currentAnalysisTargets'));
 const value=name=>props.properties.find(property=>propertyKey(property)===name).value,callback=value('onGenerateFromIdea'),text=source.slice(callback.start,callback.end);
 const call=findOne(text,node=>node.type==='CallExpression'&&node.arguments.length>=5&&node.arguments[4].type==='ObjectExpression'&&node.arguments[4].properties.some(property=>propertyKey(property)==='customInstructions')&&node.arguments[4].properties.some(property=>propertyKey(property)==='sourceArtifactId'));
 const target=name=>value('currentAnalysisTargets').properties.find(property=>propertyKey(property)===name).value,expression=node=>source.slice(node.start,node.end);
 return{text,ids:{content:expression(value('generatedContent')),teacher:expression(value('isTeacherMode')),processing:expression(value('isProcessing')),grade:expression(target('grade')),dok:expression(target('dok')),generate:text.slice(call.callee.start,call.callee.end)}};
}
const surfaces=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx',...['desktop/app-build','desktop/web-app/build'].map(base=>base+'/'+readFileSync(base+'/index.html','utf8').match(/src="\.\/(static\/js\/main\.[a-f0-9]+\.js)"/)[1])];
const sourceFor=file=>{const s=readFileSync(file,'utf8');return process.env.SOURCE_IDEA_TARGETS_PREVIEW==='1'?require('../tmp/literacy-four-followup-01a18ff4/host-patch.cjs').patchIdeas(s).source:s;};
const adapters=new Map();
function adapter(file,{targets,teacher=true,processing=false,generate=vi.fn()}={}){
 if(!adapters.has(file))adapters.set(file,inspectAdapter(sourceFor(file)));
 const info=adapters.get(file),item={id:'synthetic-analysis',type:'analysis',instructionalText:{role:'primary',form:'original'},data:{originalText:'Plants need water to grow.',sourceLanguage:'English',analysisTargets:targets}};
 const bindings={[info.ids.content]:item,[info.ids.teacher]:teacher,[info.ids.processing]:processing,[info.ids.grade]:'2nd Grade',[info.ids.dok]:'Level 1',[info.ids.generate]:generate};
 return{call:new Function(...Object.keys(bindings),'return ('+info.text+');')(...Object.values(bindings)),generate,item};
}
describe.each(surfaces)('saved thinking targets for source ideas: %s',file=>{
 beforeAll(()=>{if(!adapters.has(file))adapters.set(file,inspectAdapter(sourceFor(file)));});
 it.each(['Level 4','Mixed',''])('carries saved thinking target %j alongside the saved grade',dok=>{
  const a=adapter(file,{targets:{grade:'9th Grade',dok}});a.call('quiz','Use the source evidence.');
  expect(a.generate).toHaveBeenCalledOnce();const args=a.generate.mock.calls[0];expect(args[3]).toBe(a.item.data.originalText);expect(args[4]).toMatchObject({grade:'9th Grade',sourceArtifactId:a.item.id,customInstructions:'Use the source evidence.'});expect(args[5]).toBe(true);expect(args[6]).toEqual({dokLevel:dok});
 });
 it.each([undefined,null])('uses current thinking target only for a legacy missing target (%s)',dok=>{
  const a=adapter(file,{targets:{grade:'9th Grade',dok}});a.call('quiz','Use the source evidence.');
  expect(a.generate).toHaveBeenCalledOnce();expect(a.generate.mock.calls[0][6]).toEqual({dokLevel:'Level 1'});
 });
 it.each([{teacher:false},{processing:true}])('retains teacher/processing guards: %j',flags=>{
  const a=adapter(file,{...flags,targets:{grade:'9th Grade',dok:'Level 4'}});a.call('quiz','Do not generate.');expect(a.generate).not.toHaveBeenCalled();
 });
});
let dispatcher;
beforeAll(()=>{loadAlloModule('instructional_context_module.js');new Function(readFileSync('generate_dispatcher_source.jsx','utf8'))();dispatcher=window.AlloModules.GenDispatcher;});
it('reaches the final quiz provider prompt with saved thinking demand and exact source',async()=>{
 const stop=new Error('Synthetic provider boundary'),callGemini=vi.fn().mockRejectedValue(stop),noop=()=>{};
 const state={gradeLevel:'2nd Grade',dokLevel:'Level 1',history:[],inputText:'Different current editor.',activeUnitId:'lesson',selectedReadingSourceId:'',differentiationRange:'None',leveledTextLanguage:'English',selectedLanguages:[],studentInterests:[],guidedMode:false,guidedStep:0,standardsInput:'',targetStandards:[],standardsPromptString:'',sourceTopic:'Plants',currentUiLanguage:'English',audioRef:{current:null},alloBotRef:{current:null},GUIDED_STEPS:[],callGemini,extractSourceTextForProcessing:text=>({text,englishBlock:text,isBilingual:false}),cleanJson:String,getGroupDifferentiationContext:()=>'',getDefaultTitle:type=>type,t:key=>key,resolveTranslationPolicy:()=>({enabled:false,target:'English'}),glossaryImageStyle:'',universalImageStyle:'',imageGenerationStyle:'',chunkText:text=>[text],countWords:text=>text.split(/\s+/).length,textFormat:'Standard Text',leveledTextLength:'Same as Source',keepCitations:false,quizMcqCount:1,quizReflectionCount:0};
 const a=adapter('AlloFlowANTI.txt',{targets:{grade:'9th Grade',dok:'Level 4'},generate:(...args)=>dispatcher.handleGenerate(...args.slice(0,4),{...args[4],rethrowErrors:true},args[5],new Proxy({...state,...args[6]},{get:(target,key)=>key in target?target[key]:noop}))});state.history=[a.item];state.generatedContent=a.item;
 await expect(a.call('quiz','Ask for an evidence-supported explanation.')).rejects.toBe(stop);
 const prompt=callGemini.mock.calls[0][0];expect(prompt).toContain(a.item.data.originalText);expect(prompt).toContain('Level 4');expect(prompt).not.toContain('COGNITIVE DEMAND: Pitch the thinking this resource asks for at Webb\'s Depth of Knowledge Level 1.');
});
