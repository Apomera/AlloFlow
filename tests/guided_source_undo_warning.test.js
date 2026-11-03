import {beforeAll,afterEach,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';import {resolve} from 'node:path';import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url);let React,createRoot,act,Banner,host,root;
beforeAll(()=>{React=require(resolve('desktop/web-app/node_modules/react'));({createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')));({act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;window.HTMLElement.prototype.scrollIntoView=vi.fn();loadAlloModule(resolve(process.env.CLASSROOM_RECOVERY_CANDIDATES||'.','view_guided_mode_banner_module.js'));Banner=window.AlloModules.GuidedModeBanner.GuidedModeBanner;});
afterEach(()=>{if(root)act(()=>root.unmount());host?.remove();localStorage.clear();});
it('clears the source-change warning after undo, and shows it again on a different edit',()=>{
 const steps=[{id:'source-input',label:'Source'},{id:'analysis',label:'Analysis'},{id:'_final',label:'Finish'}];
 const original='Plants need sunlight and water.';const props={GUIDED_STEPS:steps,allGuidedSteps:steps,GUIDED_TOUR_MAP:{},guidedStep:1,t:()=>'',tourSteps:[],history:[],guidedCreatedHistoryIds:['made'],guidedCompletedIds:[],guidedSkippedIds:[],wordSoundsHistory:[],setGuidedStep:vi.fn(),setInputText:vi.fn(),setShowGuidedTip:vi.fn(),handleExitGuidedMode:vi.fn(),handleGuidedSkip:vi.fn()};
 host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
 const render=text=>act(()=>root.render(React.createElement(Banner,{...props,inputText:text})));
 const warning=()=>[...host.querySelectorAll('[role="alert"]')].find(n=>/source.*changed/i.test(n.textContent));
 render(original);expect(warning()).toBeFalsy();render(original+' More.');expect(warning()).toBeTruthy();render(original);expect(warning()).toBeFalsy();render('Different passage.');expect(warning()).toBeTruthy();render('  '+original+'  ');expect(warning()).toBeFalsy();
});
