import {beforeAll,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';

let createHandler;
beforeAll(()=>{
  const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  const marker='_docH.keydown = ',start=source.indexOf(marker)+marker.length;
  const end=source.indexOf("        document.addEventListener('keyup'",start);
  expect(start).toBeGreaterThan(marker.length);expect(end).toBeGreaterThan(start);
  const handler=source.slice(start,end).trim().replace(/\);$/,'');
  createHandler=new Function('engine','setBuildShape','upd','BLOCK_TYPES','closeGameSettings','return ('+handler+');');
});
function fixture(){
  const engine={_modalState:{},_toggleHud:vi.fn()},setBuildShape=vi.fn(),upd=vi.fn(),closeGameSettings=vi.fn();
  const handle=createHandler(engine,setBuildShape,upd,[{id:'stone'},{id:'wood'}],closeGameSettings);
  return {engine,setBuildShape,upd,closeGameSettings,handle};
}
function target(kind){
  const node=document.createElement(kind==='editable'?'div':kind);
  if(kind==='editable'){
    node.setAttribute('contenteditable','true');
    Object.defineProperty(node,'isContentEditable',{value:true});
  }
  return node;
}
// WCAG 2.1.4: letter/digit shortcuts act only while focus is inside the world surface.
function worldTarget(){
  let wrap=document.getElementById('geoworld-fs-wrap');
  if(!wrap){wrap=document.createElement('div');wrap.id='geoworld-fs-wrap';document.body.appendChild(wrap);}
  const node=document.createElement('div');wrap.appendChild(node);return node;
}
function press(app,node,key,code){
  const event=new KeyboardEvent('keydown',{key,code,bubbles:true,cancelable:true});
  Object.defineProperty(event,'target',{value:node});app.handle(event);return event;
}
const fields=['input','textarea','select','editable'];
const shortcuts=[['u','KeyU'],['q','KeyQ'],['r','KeyR'],['1','Digit1']];

describe('native form fields keep their keyboard behavior',()=>{
  it.each(fields.flatMap(field=>shortcuts.map(([key,code])=>[field,key,code])))('%s retains native %s without changing the world',(field,key,code)=>{
    const app=fixture(),event=press(app,target(field),key,code);
    expect(app.engine._toggleHud).not.toHaveBeenCalled();expect(app.setBuildShape).not.toHaveBeenCalled();expect(app.upd).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
  it.each(fields)('Escape from %s delegates to the Settings close handler',field=>{
    const app=fixture();app.engine._modalState.showGameSettings=true;press(app,target(field),'Escape','Escape');
    expect(app.closeGameSettings).toHaveBeenCalledOnce();expect(app.upd).not.toHaveBeenCalled();
    expect(app.engine._toggleHud).not.toHaveBeenCalled();expect(app.setBuildShape).not.toHaveBeenCalled();
  });
});

describe('the world surface still owns its shortcuts',()=>{
  it('U still toggles world controls and consumes the shortcut',()=>{
    const app=fixture(),event=press(app,worldTarget(),'u','KeyU');expect(app.engine._toggleHud).toHaveBeenCalledOnce();expect(event.defaultPrevented).toBe(true);
  });
  it.each([['q','KeyQ','cycle'],['r','KeyR','rotate']])('%s still changes the build shape in the world',(key,code,action)=>{
    const app=fixture();press(app,worldTarget(),key,code);expect(app.setBuildShape).toHaveBeenCalledExactlyOnceWith(action);
  });
  it('a number still chooses a world material',()=>{
    const app=fixture();press(app,worldTarget(),'1','Digit1');expect(app.upd).toHaveBeenCalledExactlyOnceWith('selectedBlock',0);
  });
});
