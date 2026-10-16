import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
let UI,root,element;
const board=()=>({playStyle:'tabletop',travelLimit:3,starts:['home'],projects:[],locations:['home','new','a','b','c','target'].map(id=>({id,name:'Station '+id})),edges:[['home','new'],['new','target'],['home','a'],['a','b'],['b','c'],['c','target']]});
const progress=()=>({position:'home',visited:['home','a','b','c'],built:[]});
const find=selector=>element.querySelector(selector);
async function render(props={}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  await act(async()=>root.render(React.createElement(UI.JourneyPlanner,{board:board(),progress:progress(),targetId:'target',t:key=>key,...props})));
}
const click=async selector=>{await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({entryPoints:['lesson_board_journey_ui.jsx'],bundle:true,write:false,format:'iife',globalName:'JourneyUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return JourneyUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Destination journey planning controls',()=>{
  it('compares route effort and inspects the legal next stop without changing the game',async()=>{
    const b=board(),p=progress(),before=JSON.stringify({b,p}),onInspect=vi.fn(),random=vi.spyOn(Math,'random');
    await render({board:b,progress:p,onInspect});
    random.mockClear();
    expect(find('[data-journey-segments]').textContent).toBe('2');
    expect(find('[data-journey-investigations]').textContent).toBe('2');
    expect(find('[data-journey-turns]').textContent).toBe('2');
    expect(find('[data-journey-next]').textContent).toContain('Next investigation: Station new');
    await click('[data-journey-option=discovery]');
    expect(find('[data-journey]').dataset.journeyRoute).toBe('discovery');
    expect(find('[data-journey-segments]').textContent).toBe('4');
    expect(find('[data-journey-investigations]').textContent).toBe('1');
    expect(find('[data-journey-next]').textContent).toContain('Next travel stop: Station c');
    expect(find('[data-journey-option=discovery]').getAttribute('aria-pressed')).toBe('true');
    await click('[data-journey-inspect=c]');expect(onInspect).toHaveBeenCalledExactlyOnceWith('c');
    expect(JSON.stringify({b,p})).toBe(before);expect(random).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Construction and other moves are not included');
    expect(element.textContent).toContain('does not move the party or commit a route');
  });
  it('updates remaining effort when the party advances and removes consumed destinations',async()=>{
    await render({progress:{...progress(),position:'new',visited:[...progress().visited,'new']}});
    expect(find('[data-journey-segments]').textContent).toBe('1');
    expect(find('[data-journey-investigations]').textContent).toBe('1');
    expect(find('[data-journey-turns]').textContent).toBe('1');
    expect(find('[data-journey-next]').dataset.journeyNext).toBe('target');
    await render({progress:{...progress(),visited:[...progress().visited,'target']}});
    expect(find('[data-journey]')).toBeNull();
  });
  it('resets a local alternate-route choice when inspecting another destination',async()=>{
    await render();await click('[data-journey-option=discovery]');
    await render({targetId:'new'});
    expect(find('[data-journey]').dataset.journeyRoute).toBe('direct');
    expect(find('[data-journey-next]').dataset.journeyNext).toBe('new');
  });
  it('supports externally controlled route selection for the tabletop overlay',async()=>{
    const onRouteChange=vi.fn();await render({routeId:'discovery',onRouteChange});
    await click('[data-journey-option=direct]');expect(onRouteChange).toHaveBeenCalledExactlyOnceWith('direct');
    expect(find('[data-journey]').dataset.journeyRoute).toBe('discovery');
    await render({routeId:'direct',onRouteChange});expect(find('[data-journey]').dataset.journeyRoute).toBe('direct');
  });
  it('keeps journey comparison usable without an inspection callback and labels each kind of stop',async()=>{
    await render();expect(find('[data-journey-inspect]').disabled).toBe(true);
    expect(find('[data-journey-stop=home]').dataset.journeyStopKind).toBe('start');
    expect(find('[data-journey-stop=new]').textContent).toContain('Investigate to continue');
    expect(find('[data-journey-stop=target]').textContent).toContain('Destination investigation');
    await click('[data-journey-option=discovery]');
    expect(find('[data-journey-stop=a]').textContent).toContain('Explored · may pass through');
  });
});
