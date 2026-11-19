import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url),{source,makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
const React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;

// 2026-11-18 shorter teacher setup page (same features, less at once):
// - Once a board is open, its summary and the Try / Play solo / Save buttons come right after the
//   opening notices, before the expedition dealer and the mission and game options.
// - The teacher preview ("check every stop") starts folded for the ready-made sample, whose stops
//   are already reviewed. A generated or imported board, or any quality finding, keeps it open.
// On a 390px phone the setup page went from ~8,900px to ~5,300px and "Play solo" from ~4,920px
// down to ~1,710px; on a 1280px laptop "Play solo" moved from ~2,965px to ~1,044px.

let root,host,api;
const props={appId:'board-app',activeSessionCode:'ROOM-A',user:{uid:'teacher-a'},inputText:source,language:'English',t:key=>key,onClose:vi.fn(),callGemini:async()=>JSON.stringify(makeBoard())};
const mount=async patch=>{if(!root){host=document.createElement('div');document.body.append(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(api.LessonBoardSetup,{...props,...patch})));};
const button=text=>[...host.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
const click=async node=>{expect(node).toBeTruthy();await act(async()=>node.click());};
const before=(a,b)=>!!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
beforeAll(()=>{window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.AlloLanguageContext=React.createContext({t:key=>key});window.UiLanguageSelector=()=>null;window.__alloHooks={useFocusTrap(){}};window.__alloFirebase={db:{},doc:(_,...parts)=>parts.join('/'),getDoc:vi.fn(),updateDoc:vi.fn()};window.__alloShared={db:{},warnLog(){}};loadAlloModule('lesson_board_module.js');api=window.AlloModules;});
afterEach(async()=>{if(root)await act(async()=>root.unmount());root=null;host?.remove();host=null;localStorage.clear();sessionStorage.clear();});

describe('Lesson Board shorter setup page',()=>{
  it('puts the ready-made board summary and its play buttons before the dealer and the options',async()=>{
    await mount({allowLive:false});await click(host.querySelector('[data-board-sample]'));
    const play=host.querySelector('[data-board-play-solo]'),dealer=host.querySelector('[data-expedition-dealer]'),mission=host.querySelector('.lb-mission-picker'),blueprint=host.querySelector('[data-board-blueprint]');
    expect(play&&dealer&&mission&&blueprint).toBeTruthy();
    expect(before(blueprint,dealer)).toBe(true);
    expect(before(play,dealer)).toBe(true);
    expect(before(play,mission)).toBe(true);
    expect(host.querySelectorAll('[data-board-blueprint]').length).toBe(1);
    expect(host.querySelectorAll('[data-board-play-solo]').length).toBe(1);
  });

  it('starts the teacher preview folded for the ready-made sample but open for a generated board',async()=>{
    await mount({allowLive:false});await click(host.querySelector('[data-board-sample]'));
    const sample=host.querySelector('[data-board-teacher-preview]');
    expect(sample).toBeTruthy();expect(sample.open).toBe(false);
    expect(sample.querySelector('[data-preview-stop]')).toBeTruthy();
    await act(async()=>root.unmount());root=null;host.remove();host=null;
    await mount({allowLive:false});await click(button('Generate lesson board'));
    const generated=host.querySelector('[data-board-teacher-preview]');
    expect(generated).toBeTruthy();expect(generated.open).toBe(true);
  });

  it('keeps the generated board summary before the options too',async()=>{
    await mount({allowLive:false});await click(button('Generate lesson board'));
    expect(before(host.querySelector('[data-board-play-solo]'),host.querySelector('.lb-mission-picker'))).toBe(true);
  });
});
