import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const service=createRequire(import.meta.url)('../agent_core_resource_pack_module.js');
const reading={id:'r',type:'simplified',title:'Reading',meta:'',data:'Water changes state as it moves through a repeating cycle. Read the source to explain the changes.'};
const directions={id:'d',type:'directions',title:'Start',meta:'',data:'Read the source and explain how water changes state.'};
const request={requestId:'plan-test',sourceTopic:'Water',sourceText:'Water changes state.',learningGoal:'Explain changes',resourcePlan:['directions'],privacy:{confirmNoStudentPii:true,confirmSourcePermission:true},providerPolicy:{provider:'stub'}};
const generate=history=>service.generate(request,{name:'stub',generateText:async()=>({history})});
describe('provider output must fulfill its normalized plan',()=>{
 it.each([[directions],[directions,reading],[reading,directions,{...directions,id:'extra'}]])('rejects missing, reordered, or extra resources: %j',async(...args)=>{const history=Array.isArray(args[0])?args[0]:args;expect((await generate(history)).errors.some(e=>e.code==='resource-plan-mismatch')).toBe(true);});
 it('accepts the requested order including the automatic adapted companion',async()=>{expect((await generate([reading,directions])).ok).toBe(true);});
 it('rejects unknown quiz types instead of rendering an empty MCQ',()=>{const p=service.compose({requestId:'quiz-test',sourceTopic:'Water',learningGoal:'Explain changes',privacy:request.privacy,history:[{id:'q',type:'quiz',title:'Quiz',meta:'',data:{questions:Array.from({length:3},()=>({type:'essay-typo',question:'Explain the source.'}))}}]});expect(p.errors.some(e=>e.code==='unsupported-quiz-type')).toBe(true);});
 it('does not mistake a base64 token for sensitive text, while preserving the image policy',()=>{const p=service.compose({requestId:'image-test',sourceTopic:'Water',learningGoal:'Explain changes',privacy:request.privacy,history:[{...directions,data:'Read the source. data:image/png;base64,AAA/IEP/BBB='}]});expect(p.ok).toBe(false);const valid=service.compose({requestId:'image-test',sourceTopic:'Water',learningGoal:'Explain changes',privacy:request.privacy,history:[{...directions,data:{body:'Read the source.',preview:'data:image/png;base64,AAA/IEP/BBB='}}]});expect(valid.errors.map(e=>e.code)).toContain('embedded-image-payload');expect(valid.errors.map(e=>e.code)).not.toContain('privacy-risk-detected');});
});
