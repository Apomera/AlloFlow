import {beforeAll,describe,it,expect} from 'vitest';
import {loadAlloModule} from './setup.js';
let sanitize;
beforeAll(()=>{loadAlloModule('video_studio_module.js');sanitize=window.AlloModules.VideoStudio.vsSanitizeCoachAdvice;});
describe('coach follow-up classification',()=>{
  const raw={guidance:'Describe the error.',kind:'navigation',done:true,target:{x:.1,y:.2,w:.2,h:.1}};
  it.each(['clarify','escalate'])('removes misleading highlights and completion for %s',nextAction=>{
    const result=sanitize({...raw,nextAction},{posture:'learner'});
    expect(result).toMatchObject({target:null,done:false,nextAction,refused:false});
  });
  it('lets a model report apparent completion without highlighting an action',()=>{
    expect(sanitize({...raw,nextAction:'verify'},{posture:'learner'})).toMatchObject({target:null,done:true,nextAction:'verify'});
  });
  it('preserves the existing shape when the optional field is absent',()=>{
    const result=sanitize(raw,{posture:'learner'});expect(result.nextAction).toBeUndefined();expect(result.target).not.toBeNull();
  });
  it('ignores unrecognized action labels',()=>{
    expect(sanitize({...raw,nextAction:'run-command'},{posture:'educator'}).nextAction).toBeUndefined();
  });
  it('cannot use clarification labels to bypass learner content restrictions',()=>{
    expect(sanitize({...raw,kind:'content',nextAction:'clarify'},{posture:'learner'})).toMatchObject({refused:true,target:null,done:false});
  });
});
