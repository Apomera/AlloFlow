import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let Chat, AC;
beforeAll(() => {
  window.React = global.React = require(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('allo_commands_module.js'); loadAlloModule('udl_chat_module.js');
  AC = window.AlloModules.AlloCommands; Chat = window.AlloModules.UdlChat;
});
afterEach(() => { window.AlloModules.AlloCommands = AC; });
const options = () => [
  { commandId:'create_lesson',label:'Build a lesson using this source',params:{},reason:'Source text is ready.',effect:'Opens guided setup.' },
  { commandId:'plan_full_pack',label:'Review a full-pack plan',params:{},reason:'Several resources may help.',effect:'Creates a plan to review before generation.' },
  { commandId:'generate_quiz',label:'Create an assessment',params:{},reason:'Check understanding.',effect:'Generates questions from the current source.' },
];
function harness() {
  let messages=[];
  const ctx={ isTeacherMode:true, commandScopeToken:'scope-1', hasSourceText:true, hasSourceOrAnalysis:true };
  const api={ ...AC, detectNavigationIntent:()=>null,
    routeUtterance:vi.fn(async()=>({preview:true,commandId:'create_lesson',label:'Build a lesson',params:{}})),
    getCommandSuggestions:vi.fn(()=>options()), validateCommandSuggestion:vi.fn(()=>({ok:true})),
    runCommandById:vi.fn(async(_ctx,commandId,params)=>({handled:true,ok:true,commandId,params,narration:'Opened '+commandId})),
    getCommandContract:()=>({params:[]}), sanitizeCommandParams:(_id,p)=>p,
  };
  window.AlloModules.AlloCommands=api;
  const d={_alloCmdCtx:()=>ctx,_botCommandPlanningRef:{current:{serial:0}},_pendingBotCmdRef:{current:null},_pendingBotPlanRef:{current:null},
    _planRunRef:{current:{running:false}},_planUndoRef:{current:null},lastIntentSnapshotRef:{current:null},
    setActiveView:vi.fn(),setGeneratedContent:vi.fn(),setHistory:vi.fn(),setInputText:vi.fn(),setUdlInput:vi.fn(),setIsChatProcessing:vi.fn(),
    setUdlMessages:update=>{messages=typeof update==='function'?update(messages):update;},udlMessages:[],udlInput:'',
    _sendUdlToChat:vi.fn(),answerUdlQuestion:vi.fn(async()=>({ok:true})),inputText:'PRIVATE SOURCE CANARY',generatedContent:{},history:[],activeView:'source',t:()=>''};
  return {ctx,api,d,messages:()=>messages,last:()=>messages.at(-1),send:input=>{d.udlMessages=messages;return Chat.planAndSendUdlMessage(input,d);},
    choose:(commandId,requestId=d._pendingBotCmdRef.current?.id)=>({action:'command-option',requestId,commandId}),
    choice:(value,requestId=d._pendingBotCmdRef.current?.id)=>({action:'command-choice',requestId,value}),clear:()=>{messages=[];}};
}
describe('AlloBot suggested action acceptance',()=>{
  it('offers ranked explanations without execution or a second AI route',async()=>{
    const h=harness();await h.send('can you help me build a lesson');
    expect(h.last().commandOptions.map(x=>x.commandId)).toEqual(options().map(x=>x.commandId));
    expect(h.last().commandOptions.every(x=>x.reason&&x.effect)).toBe(true);
    expect(h.api.runCommandById).not.toHaveBeenCalled();expect(h.api.routeUtterance).toHaveBeenCalledOnce();
    expect(h.api.routeUtterance.mock.calls[0][2].allowAi).toBe(false);
    expect(JSON.stringify(h.messages())).not.toMatch(/PRIVATE SOURCE CANARY|scope-1|commandScopeToken/);
  });
  it('accepts exactly the clicked alternative and rejects its repeated click',async()=>{
    const h=harness();await h.send('help me build a lesson');const action=h.choose('plan_full_pack');
    await h.send(action);await h.send(action);
    expect(h.api.runCommandById).toHaveBeenCalledOnce();expect(h.api.runCommandById.mock.calls[0][1]).toBe('plan_full_pack');
    expect(h.d._pendingBotCmdRef.current).toBeNull();
  });
  it.each(['yes','1'])('accepts the suggested action with %s',async reply=>{
    const h=harness();await h.send('help me build a lesson');await h.send(reply);
    expect(h.api.runCommandById.mock.calls[0][1]).toBe('create_lesson');
  });
  it('accepts an alternative by its displayed order',async()=>{
    const h=harness();await h.send('help me build a lesson');await h.send('2');
    expect(h.api.runCommandById.mock.calls[0][1]).toBe('plan_full_pack');
  });
  it('keeps chatting about the original request without executing an option',async()=>{
    const h=harness();await h.send('help me build a lesson');await h.send(h.choice('__allo_skip'));
    expect(h.api.runCommandById).not.toHaveBeenCalled();expect(h.d._sendUdlToChat).toHaveBeenCalledWith('help me build a lesson');
    expect(h.d._pendingBotCmdRef.current).toBeNull();
  });
  it('a stale card cannot accept or cancel a newer suggestion',async()=>{
    const h=harness();await h.send('help me build a lesson');const old=h.choose('generate_quiz');const oldSkip=h.choice('__allo_skip');
    await h.send('help me assess learning');const current=h.d._pendingBotCmdRef.current;
    await h.send(old);await h.send(oldSkip);
    expect(h.d._pendingBotCmdRef.current).toBe(current);expect(h.api.runCommandById).not.toHaveBeenCalled();
  });
  it('refreshes changed source/workspace choices and requires a fresh click',async()=>{
    const h=harness();await h.send('help me build a lesson');const old=h.choose('plan_full_pack');h.ctx.commandScopeToken='scope-2';
    await h.send(old);expect(h.api.runCommandById).not.toHaveBeenCalled();expect(h.last().text).toMatch(/changed/);
    expect(h.d._pendingBotCmdRef.current.id).not.toBe(old.requestId);
    await h.send(old);expect(h.api.runCommandById).not.toHaveBeenCalled();
    await h.send(h.choose('plan_full_pack'));expect(h.api.runCommandById).toHaveBeenCalledOnce();
  });
  it('closes the offer if current role has no valid choices',async()=>{
    const h=harness();await h.send('help me build a lesson');const action=h.choose('generate_quiz');
    h.ctx.commandScopeToken='student-scope';h.ctx.isTeacherMode=false;h.api.getCommandSuggestions.mockReturnValue([]);
    await h.send(action);expect(h.api.runCommandById).not.toHaveBeenCalled();expect(h.d._pendingBotCmdRef.current).toBeNull();
  });
  it('rechecks availability at acceptance even when the scope token is unchanged',async()=>{
    const h=harness();await h.send('help me build a lesson');h.api.validateCommandSuggestion.mockReturnValue({ok:false,reason:'unavailable'});
    await h.send(h.choose('generate_quiz'));expect(h.api.runCommandById).not.toHaveBeenCalled();expect(h.last().text).toMatch(/changed/);
  });
  it('cannot execute an offer after chat history was cleared',async()=>{
    const h=harness();await h.send('help me build a lesson');const old=h.choose('generate_quiz');h.clear();await h.send(old);
    expect(h.api.runCommandById).not.toHaveBeenCalled();expect(h.d._pendingBotCmdRef.current).toBeNull();
  });
  it('retrying an ordinary question closes a pending action',async()=>{
    const h=harness();await h.send('help me build a lesson');const old=h.choose('generate_quiz');
    await h.send({action:'retry-chat',text:'What is academic discourse?'});await h.send(old);
    expect(h.api.runCommandById).not.toHaveBeenCalled();expect(h.d.answerUdlQuestion).toHaveBeenCalledOnce();
  });
  it('marks the accepted operation pending before its asynchronous handler returns',async()=>{
    const h=harness();let finish;h.api.runCommandById.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
    await h.send('help me build a lesson');const action=h.choose('generate_quiz');const work=h.send(action);
    expect(h.last().operationStatus).toBe('pending');expect(h.d._pendingBotCmdRef.current).toBeNull();await h.send(action);
    finish({handled:true,ok:true,narration:'Ready'});await work;expect(h.api.runCommandById).toHaveBeenCalledOnce();
  });
  it('caps the copied option list without copying a private scope snapshot',async()=>{
    const h=harness();h.api.getCommandSuggestions.mockReturnValue(Array.from({length:9},(_,i)=>({...options()[0],commandId:'choice_'+i})));
    await h.send('help me build a lesson');expect(h.last().commandOptions).toHaveLength(5);expect(h.last()).not.toHaveProperty('scope');
  });
  it('swallows invalid option ids and unowned command actions',async()=>{
    const h=harness();await h.send({action:'command-choice',requestId:'missing',value:'__allo_do'});expect(h.api.routeUtterance).not.toHaveBeenCalled();
    await h.send('help me build a lesson');await h.send(h.choose('clear_workspace'));expect(h.api.runCommandById).not.toHaveBeenCalled();
  });
  it('drops an AI result when the current lesson changed while routing',async()=>{
    const h=harness();let finish;h.api.routeUtterance.mockImplementation((_ctx,_text,opts)=>opts.allowAi?new Promise(resolve=>{finish=resolve;}):Promise.resolve(null));
    h.api.getCommandSuggestions.mockReturnValue([]);const work=h.send('an ambiguous request');
    for(let i=0;i<8&&!finish;i++)await Promise.resolve();expect(finish).toBeTypeOf('function');h.ctx.commandScopeToken='new-lesson';
    finish({preview:true,commandId:'create_lesson',params:{}});await work;
    expect(h.d._pendingBotCmdRef.current).toBeNull();expect(h.api.runCommandById).not.toHaveBeenCalled();expect(h.last().text).toMatch(/changed/);
  });
});

describe('AlloBot option fallback and real command integration',()=>{
  it('does not fall back to offering an unavailable matched command',async()=>{
    const h=harness();h.api.getCommandSuggestions.mockReturnValue([]);
    h.api.validateCommandSuggestion.mockReturnValue({ok:false,reasonCode:'unavailable',reason:'Another generation is running.'});
    await h.send('generate a quiz');expect(h.d._pendingBotCmdRef.current).toBeNull();expect(h.last().text).toContain('running');
    expect(h.api.runCommandById).not.toHaveBeenCalled();
  });
  it('keeps missing-parameter review available and binds parameter edits to the offer',async()=>{
    const h=harness();h.api.getCommandSuggestions.mockReturnValue([]);
    h.api.validateCommandSuggestion.mockReturnValue({ok:false,reasonCode:'params',reason:'Choose a step.'});
    h.api.getCommandContract=()=>({params:['step'],paramSchema:{step:{type:'number',required:true}}});
    await h.send('rebuild a step');const id=h.d._pendingBotCmdRef.current.id;
    expect(h.last().commandReview.fields.step.required).toBe(true);
    await h.send({action:'command-params',requestId:id,params:{step:2}});
    expect(h.d._pendingBotCmdRef.current.params).toEqual({step:2});expect(h.api.runCommandById).not.toHaveBeenCalled();
  });
  it('uses the actual ranker and executes only the accepted native lesson handler',async()=>{
    const h=harness();Object.assign(h.ctx,{startLessonFlow:vi.fn(),planFullPack:vi.fn(),generateQuiz:vi.fn(),generateNoteTaking:vi.fn(),callGemini:vi.fn(()=>{throw Error('Unexpected AI route');})});
    window.AlloModules.AlloCommands=AC;
    await h.send('can you help me build a lesson');
    expect(h.last().commandOptions?.length).toBeGreaterThan(1);
    expect(h.last().commandOptions[0].commandId).toBe('create_lesson');
    expect(h.ctx.startLessonFlow).not.toHaveBeenCalled();expect(h.ctx.callGemini).not.toHaveBeenCalled();
    await h.send(h.choose('create_lesson'));
    expect(h.ctx.startLessonFlow).toHaveBeenCalledWith({});expect(h.ctx.generateQuiz).not.toHaveBeenCalled();
  });
});

it('uses a local scope fallback when an older producer supplies an empty token',async()=>{
  const h=harness();h.ctx.commandScopeToken='';await h.send('help me build a lesson');
  const action=h.choose('create_lesson');h.d.inputText='Replacement source';await h.send(action);
  expect(h.api.runCommandById).not.toHaveBeenCalled();expect(h.last().text).toMatch(/changed/);
});
