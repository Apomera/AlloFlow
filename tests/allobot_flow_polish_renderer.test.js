import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve('desktop/web-app/node_modules');
let React, createRoot, act, Modal, root, host;
beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  createRoot = require(resolve(modulesDir, 'react-dom/client')).createRoot;
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_misc_modals_module.js');
  Modal = window.AlloModules.UDLGuideModal;
});
afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove(); host = null;
  vi.useRealTimers(); vi.restoreAllMocks();
});
const option = index => ({ commandId: 'option-' + index, label: 'Option ' + index, effect: 'Effect ' + index, reason: 'Reason ' + index });
const operation = overrides => ({ role: 'model', operationKind: 'command', operationId: 'request-1', operationStatus: 'review', text: 'Review actions.', ...overrides });
const styles = { container:'',header:'',body:'',inputArea:'',userBubble:'',modelBubble:'',button:'',secondaryButton:'',input:'',text:'',subText:'' };
const props = overrides => ({
  showUDLGuide:true, udlMessages:[], udlInput:'', udlInputRef:{current:null},udlScrollRef:{current:null},
  chatStyles:styles,theme:'light',t:(key,fallback)=>fallback||key,renderFormattedText:text=>text,
  handleSendUDLMessage:vi.fn(),setUdlInput:vi.fn(),setUdlMessages:vi.fn(),isChatProcessing:false,
  isAutoFillMode:true,hasUsedAutoFill:true,activeBlueprint:null,InteractiveBlueprintCard:()=>null,
  suggestedStandards:[],aiStandardQuery:'',aiStandardRegion:'',udlStandardFramework:'Common Core ELA',udlStandardGrade:'3rd Grade',
  addToast:()=>{},handleAutoFillToggle:()=>{},handleBlueprintUIUpdate:()=>{},handleExecuteBlueprint:()=>{},handleFindStandards:()=>{},
  handleSetShowUDLGuideToFalse:()=>{},handleToggleAutoSendVoice:()=>{},handleToggleIsShowMeMode:()=>{},handleToggleIsUDLGuideExpanded:()=>{},
  saveFullChat:()=>{},saveUDLAdvice:()=>{},setActiveBlueprint:()=>{},setAiStandardQuery:()=>{},setAiStandardRegion:()=>{},
  setIsBotVisible:()=>{},setIsConversationMode:()=>{},setIsDictationMode:()=>{},setStandardsInput:()=>{},setUdlStandardFramework:()=>{},setUdlStandardGrade:()=>{},
  ...overrides,
});
const mount = input => { host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);act(()=>root.render(React.createElement(Modal,input)));return input; };
const rerender = input => act(()=>root.render(React.createElement(Modal,input)));
const card = () => host.querySelector('[data-testid="active-command-workflow"]');
const button = label => [...card().querySelectorAll('button')].find(node=>node.textContent===label);
const click = node => act(()=>node.click());

describe('AlloBot compact alternatives and context',()=>{
  it('keeps primary details visible, alternatives collapsed and independently actionable',()=>{
    const input=mount(props({udlMessages:[operation({commandOptions:[1,2,3,4,5].map(option)})]}));
    const list=card().querySelector('[data-testid="command-options"]');
    expect(list.querySelector('li').querySelector('details')).toBeNull();
    const details=[...list.querySelectorAll('details')];
    expect(details).toHaveLength(4);expect(details.every(node=>!node.open)).toBe(true);
    const target=button('Option 2');
    expect(target.closest('details')).toBeNull();
    expect(target.style.minHeight).toBe('44px');
    const description=document.getElementById(target.getAttribute('aria-describedby'));
    expect(description.className).toContain('sr-only');
    expect(description.textContent).toContain('Effect 2');expect(description.textContent).toContain('Reason 2');
    act(()=>{details[0].open=true;details[0].dispatchEvent(new Event('toggle'));});
    expect(input.handleSendUDLMessage).not.toHaveBeenCalled();
    click(target);expect(input.handleSendUDLMessage).toHaveBeenCalledWith({action:'command-option',requestId:'request-1',commandId:'option-2'});
  });
  it('shows bounded existing context above the choices without copying source content',()=>{
    mount(props({udlMessages:[operation({commandContextSummary:{source:'current',grade:'Grade 6',plan:'blueprint',resourceCount:4,sourceText:'PRIVATE SOURCE',sourceTitle:'PRIVATE TITLE'},commandOptions:[option(1)]})]}));
    const summary=card().querySelector('[data-testid="command-context-summary"]');
    expect(summary.textContent).toBe('Using current source · Grade 6 · Lesson plan ready · 4 saved resources');
    expect(summary.getAttribute('aria-label')).toBe('Current lesson context');
    expect(card().firstElementChild).toBe(summary);
    expect(summary.textContent).not.toMatch(/PRIVATE/);
  });
  it('describes a new lesson without implying that the old source, plan or resources will be reused',()=>{
    mount(props({udlMessages:[operation({commandContextSummary:{newLesson:true,source:'current',grade:'Grade 8',plan:'blueprint',resourceCount:4},commandOptions:[option(1)]})]}));
    const summary=card().querySelector('[data-testid="command-context-summary"]');
    expect(summary.textContent).toBe('New lesson · Source to prepare · Grade 8');
    expect(summary.textContent).not.toMatch(/Using current source|Lesson plan ready|saved resource/);
  });
  it.each([
    [{source:'none',plan:'none',resourceCount:0},'Source not added yet · No plan generated yet'],
    [{source:'analysis',plan:'full-pack',resourceCount:1},'Using source analysis · Full Pack plan ready · 1 saved resource'],
    [{source:'unknown',plan:'other',resourceCount:Infinity},null],
  ])('renders only recognized context states (%j)',(summary,text)=>{
    mount(props({udlMessages:[operation({commandContextSummary:summary})]}));
    const node=card().querySelector('[data-testid="command-context-summary"]');
    if(text===null)expect(node).toBeNull();else expect(node.textContent).toBe(text);
  });
});

describe('AlloBot focused clarification',()=>{
  const clarification={question:'What would you like to make?',choices:[{id:'lesson',label:'Complete lesson'},{id:'resource',label:'One resource'},{id:'advice',label:'Planning advice'}]};
  it('sends bounded choice identity and keeps the composer while hiding redundant starters',()=>{
    const input=mount(props());const composer=host.querySelector('[data-help-key="chat_input"]');
    rerender({...input,udlMessages:[operation({commandClarification:clarification})]});
    expect(host.querySelector('[data-help-key="chat_input"]')).toBe(composer);
    expect(host.querySelector('[data-help-key="chat_autofill"]')).toBeNull();
    expect(host.querySelector('[data-help-key="chat_standard_tools_toggle"]')).toBeNull();
    const controls=[...card().querySelector('[data-testid="command-clarification"]').querySelectorAll('button')];
    expect(controls).toHaveLength(3);
    controls.forEach((node,index)=>{expect(node.style.minHeight).toBe('44px');click(node);expect(input.handleSendUDLMessage).toHaveBeenLastCalledWith({action:'command-clarify',requestId:'request-1',choiceId:clarification.choices[index].id});});
    expect(input.handleSendUDLMessage).toHaveBeenCalledTimes(3);
  });
  it('does not show a generic Do it or parameter form during clarification',()=>{
    mount(props({udlMessages:[operation({commandClarification:clarification,commandReview:{requestId:'request-1',params:{topic:'x'},fields:{topic:{label:'Topic'}}},choices:[{label:'Do it',value:'__allo_do'}]})]}));
    expect(card().querySelector('form')).toBeNull();expect(button('Do it')).toBeUndefined();
  });
  it('rejects malformed choices and disables unbound or processing clarification cards',()=>{
    const input=mount(props({isChatProcessing:true,udlMessages:[operation({operationId:undefined,commandClarification:{question:'Choose',choices:[...clarification.choices,{id:'lesson',label:'Duplicate'},{id:'delete',label:'Invalid'}]}})]}));
    const controls=[...card().querySelector('[data-testid="command-clarification"]').querySelectorAll('button')];
    expect(controls).toHaveLength(3);controls.forEach(node=>{expect(node.disabled).toBe(true);click(node);});
    expect(input.handleSendUDLMessage).not.toHaveBeenCalled();
  });
});

describe('AlloBot progress and recovery',()=>{
  const start=Date.parse('2026-10-24T12:00:00Z');
  const pending=(phase='preparing-tools',extra={})=>operation({operationStatus:'pending',commandProgress:{phase,startedAt:start,phaseStartedAt:start},...extra});
  it.each([
    pending(),
    operation({operationStatus:'error',commandRecovery:{requestId:'request-1',canRetry:true,canCopyDiagnostics:true}}),
    operation({operationStatus:'failed',commandRecovery:{requestId:'request-1',canRetry:false,canCopyDiagnostics:true}}),
  ])('reserves room for current progress or recovery while keeping the same composer (%j)',message=>{
    const input=mount(props());const composer=host.querySelector('[data-help-key="chat_input"]');
    expect(host.querySelector('[data-help-key="chat_autofill"]')).not.toBeNull();
    rerender({...input,udlMessages:[message]});
    expect(host.querySelector('[data-help-key="chat_autofill"]')).toBeNull();
    expect(host.querySelector('[data-help-key="chat_standard_tools_toggle"]')).toBeNull();
    expect(host.querySelector('[data-help-key="chat_input"]')).toBe(composer);
    rerender({...input,udlMessages:[operation({operationStatus:'success'})]});
    expect(host.querySelector('[data-help-key="chat_autofill"]')).not.toBeNull();
    expect(host.querySelector('[data-help-key="chat_input"]')).toBe(composer);
  });
  it.each([
    operation({operationStatus:'error',commandRecovery:{requestId:'stale',canRetry:true,canCopyDiagnostics:true}}),
    operation({operationStatus:'failed',commandRecovery:{requestId:'request-1',canRetry:false,canCopyDiagnostics:false}}),
    operation({operationKind:'command-plan',operationStatus:'pending',commandProgress:{phase:'working',startedAt:start}}),
  ])('keeps starters when the current operation has no usable command work controls (%j)',message=>{
    mount(props({udlMessages:[message]}));
    expect(host.querySelector('[data-help-key="chat_autofill"]')).not.toBeNull();
    expect(host.querySelector('[data-help-key="chat_standard_tools_toggle"]')).not.toBeNull();
  });
  it('updates elapsed time outside live regions, announces the phase, and cleans its interval',()=>{
    vi.useFakeTimers();vi.setSystemTime(start);
    const input=mount(props({udlMessages:[pending()]}));
    const progress=card().querySelector('[data-testid="command-progress"]');
    expect(progress.querySelector('[role="status"]').textContent).toBe('Preparing lesson tools');
    expect(progress.querySelector('[data-testid="command-elapsed"]').getAttribute('aria-live')).toBe('off');
    act(()=>vi.advanceTimersByTime(3000));
    expect(progress.querySelector('[data-testid="command-elapsed"]').textContent).toBe('Elapsed: 3s');
    expect(vi.getTimerCount()).toBe(1);
    rerender({...input,udlMessages:[operation({operationStatus:'success',text:'Complete'})]});
    expect(card().querySelector('[data-testid="command-progress"]')).toBeNull();expect(vi.getTimerCount()).toBe(0);
  });
  it('shows a slow-tools advisory and continues generation without a hard UI timeout',()=>{
    vi.useFakeTimers();vi.setSystemTime(start);
    const input=mount(props({udlMessages:[pending()]}));
    act(()=>vi.advanceTimersByTime(30000));expect(card().textContent).toContain('taking longer than usual');
    rerender({...input,udlMessages:[pending('generating',{commandProgress:{phase:'generating',startedAt:start,phaseStartedAt:Date.now()}})]});
    expect(card().textContent).toContain('Generating resources');expect(card().textContent).not.toContain('taking longer than usual');
    act(()=>vi.advanceTimersByTime(120000));
    expect(card().textContent).toContain('Generating resources');expect(card().textContent).toContain('Elapsed: 150s');
    expect(card().textContent).toContain('taking longer than usual');
    expect(input.handleSendUDLMessage).not.toHaveBeenCalled();
  });
  it('cleans timers on clear, closed card and modal unmount',()=>{
    vi.useFakeTimers();vi.setSystemTime(start);
    const input=mount(props({udlMessages:[pending()]}));expect(vi.getTimerCount()).toBe(1);
    rerender({...input,udlMessages:[]});expect(vi.getTimerCount()).toBe(0);
    rerender({...input,udlMessages:[pending()]});expect(vi.getTimerCount()).toBe(1);
    rerender({...input,udlMessages:[operation({operationStatus:'closed'})]});expect(vi.getTimerCount()).toBe(0);
    rerender({...input,udlMessages:[pending()]});expect(vi.getTimerCount()).toBe(1);
    act(()=>root.unmount());root=null;expect(vi.getTimerCount()).toBe(0);
  });
  it('does not start an elapsed interval for an invalid timestamp or terminal message',()=>{
    vi.useFakeTimers();vi.setSystemTime(start);
    const input=mount(props({udlMessages:[pending('working',{commandProgress:{phase:'working',startedAt:'invalid'}})]}));
    expect(vi.getTimerCount()).toBe(0);expect(card().querySelector('[data-testid="command-elapsed"]')).toBeNull();
    rerender({...input,udlMessages:[pending('working',{operationStatus:'error'})]});expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps retry and diagnostic controls bound to the failed request',()=>{
    const input=mount(props({udlMessages:[operation({operationStatus:'error',text:'Tools could not load.',commandRecovery:{requestId:'request-1',canRetry:true,canCopyDiagnostics:true}})]}));
    click(button('Retry this plan'));click(button('Copy diagnostic details'));
    expect(input.handleSendUDLMessage.mock.calls.map(call=>call[0])).toEqual([{action:'command-retry',requestId:'request-1'},{action:'command-diagnostics',requestId:'request-1'}]);
    expect(button('Retry this plan').style.minHeight).toBe('44px');
  });
  it('does not expose invalid, disabled, or unrelated recovery controls',()=>{
    const input=mount(props({udlMessages:[operation({operationStatus:'error',commandRecovery:{requestId:'old',canRetry:true,canCopyDiagnostics:true}})]}));
    expect(card().querySelector('[data-testid="command-recovery"]')).toBeNull();
    rerender({...input,isChatProcessing:true,udlMessages:[operation({operationStatus:'failed',commandRecovery:{requestId:'request-1',canRetry:false,canCopyDiagnostics:true}})]});
    expect(button('Retry this plan')).toBeUndefined();expect(button('Copy diagnostic details').disabled).toBe(true);
    click(button('Copy diagnostic details'));expect(input.handleSendUDLMessage).not.toHaveBeenCalled();
    rerender({...input,udlMessages:[pending('working',{commandRecovery:{requestId:'request-1',canRetry:true,canCopyDiagnostics:true}})]});
    expect(card().querySelector('[data-testid="command-recovery"]')).toBeNull();
  });
});

describe('AlloBot successful-generation handoff',()=>{
  const next=(commandId,label,effect)=>({commandId,label,effect});
  const actions=[next('review_lesson','Review the lesson','Open the completed lesson.'),next('preview_assignment_as_student','Preview as a student','Check the student experience.'),next('open_export_menu','Share the lesson')];
  const success=overrides=>operation({operationStatus:'success',text:'Generation finished.',commandCompletion:{requestId:'request-1',actions},...overrides});
  const group=()=>host.querySelector('[data-testid="command-completion"]');
  it('routes native reviewed-card approval with the exact current plan reference when supported',()=>{
    const previous=window.AlloModules.UdlChat;
    const blueprint={title:'Reviewed synthetic plan',recommendedResources:['quiz']};
    const execute=vi.fn();
    try {
      window.AlloModules.UdlChat={supportsReviewedBlueprintExecution:true};
      const input=mount(props({activeBlueprint:blueprint,handleExecuteBlueprint:execute,InteractiveBlueprintCard:({onConfirm})=>React.createElement('button',{'data-testid':'fixture-blueprint-generate',onClick:()=>onConfirm()},'Generate lesson')}));
      click(host.querySelector('[data-testid="fixture-blueprint-generate"]'));
      expect(input.handleSendUDLMessage).toHaveBeenCalledOnce();
      expect(input.handleSendUDLMessage).toHaveBeenCalledWith({action:'command-approved-blueprint',blueprint});
      expect(input.handleSendUDLMessage.mock.calls[0][0].blueprint).toBe(blueprint);
      expect(execute).not.toHaveBeenCalled();
    } finally {window.AlloModules.UdlChat=previous;}
  });
  it('preserves native reviewed-card generation when an older chat module lacks the bridge',()=>{
    const previous=window.AlloModules.UdlChat;const execute=vi.fn();
    try {
      window.AlloModules.UdlChat={};
      const input=mount(props({activeBlueprint:{title:'Legacy plan'},handleExecuteBlueprint:execute,InteractiveBlueprintCard:({onConfirm})=>React.createElement('button',{'data-testid':'fixture-blueprint-generate',onClick:()=>onConfirm()},'Generate lesson')}));
      click(host.querySelector('[data-testid="fixture-blueprint-generate"]'));
      expect(execute).toHaveBeenCalledOnce();expect(execute).toHaveBeenCalledWith();
      expect(input.handleSendUDLMessage).not.toHaveBeenCalled();
    } finally {window.AlloModules.UdlChat=previous;}
  });
  it('shows up to three unique native next-step controls with owned payloads and optional effects',()=>{
    const input=mount(props({udlMessages:[success({commandCompletion:{requestId:'request-1',actions:[null,{},actions[0],actions[0],actions[1],actions[2],next('open_history','History')]},choices:[{label:'Do it',value:'__allo_do'}]})]}));
    expect(group().getAttribute('aria-label')).toBe('Next steps');
    const buttons=[...group().querySelectorAll('button')];
    expect(buttons.map(node=>node.textContent)).toEqual(actions.map(action=>action.label));
    expect(button('Do it')).toBeUndefined();expect(input.handleSendUDLMessage).not.toHaveBeenCalled();
    buttons.forEach((node,index)=>{
      expect(node.type).toBe('button');expect(node.tabIndex).toBe(0);expect(node.style.minHeight).toBe('44px');
      expect(node.className).toContain('focus-visible:ring-2');
      const describedBy=node.getAttribute('aria-describedby');
      if(actions[index].effect)expect(document.getElementById(describedBy).textContent).toBe(actions[index].effect);else expect(describedBy).toBeNull();
      act(()=>node.focus());expect(document.activeElement).toBe(node);click(node);
    });
    expect(input.handleSendUDLMessage.mock.calls.map(call=>call[0])).toEqual(actions.map(action=>({action:'command-complete',requestId:'request-1',commandId:action.commandId})));
  });
  it.each([undefined,'different-request'])('disables a completion group without matching operation ownership (%s)',requestId=>{
    const input=mount(props({udlMessages:[success({commandCompletion:{requestId,actions}})]}));
    [...group().querySelectorAll('button')].forEach(node=>{expect(node.disabled).toBe(true);click(node);});
    expect(input.handleSendUDLMessage).not.toHaveBeenCalled();
    expect(host.querySelector('[data-help-key="chat_autofill"]')).not.toBeNull();
  });
  it('disables completion dispatch while chat is processing',()=>{
    const input=mount(props({isChatProcessing:true,udlMessages:[success()]}));
    [...group().querySelectorAll('button')].forEach(node=>{expect(node.disabled).toBe(true);click(node);});
    expect(input.handleSendUDLMessage).not.toHaveBeenCalled();
  });
  it.each(['review','pending','error','failed','closed','complete'])('does not expose next steps on a non-success operation (%s)',operationStatus=>{
    mount(props({udlMessages:[success({operationStatus})]}));expect(group()).toBeNull();
  });
  it('reserves handoff room without replacing the composer and returns starters when retired',()=>{
    const input=mount(props());const composer=host.querySelector('[data-help-key="chat_input"]');
    rerender({...input,udlMessages:[success()]});
    expect(group()).not.toBeNull();expect(host.querySelector('[data-help-key="chat_autofill"]')).toBeNull();
    expect(host.querySelector('[data-help-key="chat_standard_tools_toggle"]')).toBeNull();
    expect(host.querySelector('[data-help-key="chat_input"]')).toBe(composer);
    rerender({...input,udlMessages:[success(),operation({operationStatus:'closed'})]});
    expect(group()).toBeNull();expect(host.querySelector('[data-help-key="chat_autofill"]')).not.toBeNull();
    expect(host.querySelector('[data-help-key="chat_input"]')).toBe(composer);
  });
});
