import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {loadTool,makeCtx,ReactDOMServer,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const files=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(node,predicate){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const match=find(child,predicate);if(match)return match;}return null;}return predicate(node)?node:find(node.props?.children,predicate);}
function session(file,extra={},direction='ltr'){
  resetStemLab();const tool=loadTool(file,'anatomy');let data={anatomy:{system:'skeletal',view:'anterior',complexity:3,_activeTab:'explore',_structureNotes:{skull:'Saved note'},...extra}};
  const apply=update=>{data=typeof update==='function'?update(data):update;};
  const render=()=>tool.render(makeCtx({toolData:data,gradeLevel:'9',setToolData:apply}));
  const node=find(render(),n=>n.props?.['data-anatomy-tab-strip']);expect(node).not.toBeNull();
  const host=document.createElement('div');host.innerHTML=ReactDOMServer.renderToStaticMarkup(node);document.body.appendChild(host);
  const strip=host.querySelector('[data-anatomy-tab-strip]');strip.style.direction=direction;
  const press=(key,modifiers={})=>{const preventDefault=vi.fn();node.props.onKeyDown({key,currentTarget:strip,preventDefault,...modifiers});for(const tab of strip.querySelectorAll('[role=tab]'))tab.setAttribute('aria-selected',String(tab.id==='anatomy-mode-tab-'+data.anatomy._activeTab));return preventDefault;};
  return {data:()=>data.anatomy,strip,host,node,press};
}
let scrollDescriptor;
beforeEach(()=>{vi.useFakeTimers();document.body.innerHTML='';scrollDescriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'scrollIntoView');Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:vi.fn()});});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();document.body.innerHTML='';if(scrollDescriptor)Object.defineProperty(HTMLElement.prototype,'scrollIntoView',scrollDescriptor);else delete HTMLElement.prototype.scrollIntoView;});
for(const file of files)describe('Anatomy mode navigation: '+file,()=>{
  it('advances visually right in LTR and keeps focus on the mode tab',()=>{
    const s=session(file),quiz=document.createElement('div');quiz.setAttribute('data-anatomy-quiz-panel','true');quiz.tabIndex=-1;s.host.appendChild(quiz);const panelFocus=vi.spyOn(quiz,'focus');
    expect(s.press('ArrowRight')).toHaveBeenCalledOnce();expect(s.data()._activeTab).toBe('quiz');vi.runAllTimers();
    expect(document.activeElement.id).toBe('anatomy-mode-tab-quiz');expect(panelFocus).not.toHaveBeenCalled();expect(s.data()._structureNotes).toEqual({skull:'Saved note'});
  });
  it('follows the visual direction in RTL and wraps at the first tab',()=>{
    const forward=session(file,{},'rtl');forward.press('ArrowLeft');expect(forward.data()._activeTab).toBe('quiz');vi.runAllTimers();expect(document.activeElement.id).toBe('anatomy-mode-tab-quiz');
    const backward=session(file,{},'rtl');backward.press('ArrowRight');expect(backward.data()._activeTab).toBe('procedure');vi.runAllTimers();expect(document.activeElement.id).toBe('anatomy-mode-tab-procedure');
  });
  it('uses Home and End in either direction and only exposes eligible modes',()=>{
    for(const direction of ['ltr','rtl']){
      const first=session(file,{_activeTab:'spotter',complexity:1},direction);first.press('Home');expect(first.data()._activeTab).toBe('explore');vi.runAllTimers();expect(document.activeElement.id).toBe('anatomy-mode-tab-explore');
      const last=session(file,{_activeTab:'spotter',complexity:1},direction);last.press('End');expect(last.data()._activeTab).toBe('homeoHunt');vi.runAllTimers();expect(document.activeElement.id).toBe('anatomy-mode-tab-homeoHunt');
    }
  });
  it('leaves modified arrows and unrelated keys available to the browser',()=>{
    const s=session(file),before=structuredClone(s.data());for(const modifiers of [{altKey:true},{ctrlKey:true},{metaKey:true},{shiftKey:true}])expect(s.press('ArrowRight',modifiers)).not.toHaveBeenCalled();expect(s.press('PageDown')).not.toHaveBeenCalled();expect(s.data()).toEqual(before);
  });
  it('reveals a clipped tab by scrolling only its horizontal strip',()=>{
    const s=session(file),tab=s.strip.querySelector('#anatomy-mode-tab-explore');vi.spyOn(s.strip,'getBoundingClientRect').mockReturnValue({left:100,right:300});vi.spyOn(tab,'getBoundingClientRect').mockReturnValue({left:350,right:450});
    s.strip.scrollLeft=0;(s.node.props.ref||s.node.ref)(s.strip);vi.runAllTimers();expect(s.strip.scrollLeft).toBe(150);expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
  it('ignores a queued visibility update after the selected tab changes',()=>{
    const s=session(file),tab=s.strip.querySelector('#anatomy-mode-tab-explore');vi.spyOn(s.strip,'getBoundingClientRect').mockReturnValue({left:100,right:300});vi.spyOn(tab,'getBoundingClientRect').mockReturnValue({left:350,right:450});
    (s.node.props.ref||s.node.ref)(s.strip);s.strip._anatomyActiveTab='spotter';vi.runAllTimers();expect(s.strip.scrollLeft).toBe(0);expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
  it('does not move focus to a tab after another mode becomes selected',()=>{
    const s=session(file);s.press('ArrowRight');s.strip.querySelector('#anatomy-mode-tab-quiz').setAttribute('aria-selected','false');vi.runAllTimers();expect(document.activeElement.id).not.toBe('anatomy-mode-tab-quiz');
  });
});
