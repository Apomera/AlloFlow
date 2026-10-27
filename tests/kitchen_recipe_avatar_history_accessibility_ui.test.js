// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';

const require=createRequire(import.meta.url),M=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),V=require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const source=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar.js','utf8'),notebookSource=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar_notebook.js','utf8');
let ui;
const $=id=>document.getElementById(id),get=()=>ui.getSession(),buttons=()=>[...$('avatarHistory').querySelectorAll('button[data-avatar-history-id]')];
function choose(id,value){$(id).value=String(value);$(id).dispatchEvent(new Event('change',{bubbles:true}));}
function start(){choose('avatarActivity','avatar-sauce-rescue');choose('avatarMode','independent');$('avatarStart').click();}
function inspect(){const before=get().record.intents.length;$('avatarInspect').click();for(let n=0;get().pending?.phase!=='ready'&&n<15;n++){$('avatarPlace').click();$('avatarAdvance').click();}expect(get().pending.phase).toBe('ready');$('avatarCommit').click();expect(get().record.intents).toHaveLength(before+1);}
function saveExplanation(text){$('avatarReflection').value=text;$('avatarReflection').dispatchEvent(new Event('input',{bubbles:true}));$('avatarSave').click();}
function description(button){return (button.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean).map(id=>{const node=$(id);expect(node).not.toBeNull();expect(node.closest('[hidden]')).toBeNull();return node.textContent;}).join(' ');}
function twoAttempts(){start();inspect();saveExplanation('First check: thick ridges on the spoon.');const first=buttons().find(button=>button.getAttribute('aria-current')==='true');start();inspect();saveExplanation('Second check: compare the recorded trail.');const second=buttons().find(button=>button.getAttribute('aria-current')==='true');return{first,second};}

beforeEach(()=>{
  document.body.innerHTML='<div id="historyAccessHost"></div>';localStorage.clear();
  window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenAvatarStation=M;window.KitchenAvatarMotion=V;
  Object.defineProperty(window,'matchMedia',{configurable:true,value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(()=>1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
  window.eval(notebookSource);window.eval(source);ui=window.KitchenAvatarUI.mount({container:$('historyAccessHost'),model:M});
});
afterEach(()=>{ui?.dispose();vi.restoreAllMocks();localStorage.clear();document.body.replaceChildren();});

describe('Saved attempts remain distinguishable and reachable with assistive navigation',()=>{
  it('distinguishes two attempts with the same activity, mode, and completed-action count',()=>{
    const {first,second}=twoAttempts();expect(buttons()).toHaveLength(2);
    expect(first.textContent).not.toBe(second.textContent);expect(first.textContent).toMatch(/Saved attempt\s+2/i);expect(second.textContent).toMatch(/Saved attempt\s+1/i);
    expect(description(first)).toContain('First check: thick ridges on the spoon.');expect(description(second)).toContain('Second check: compare the recorded trail.');
    expect(first.getAttribute('aria-current')).toBeNull();expect(second.getAttribute('aria-current')).toBe('true');
  });

  it('restores the intended explanation and preserves the focused history button through reordering',()=>{
    const {first,second}=twoAttempts(),firstId=first.dataset.avatarHistoryId,secondId=second.dataset.avatarHistoryId;
    first.focus();first.click();expect(document.activeElement).toBe(first);expect(buttons()[0]).toBe(first);expect(first.dataset.avatarHistoryId).toBe(firstId);
    expect($('avatarReflection').value).toBe('First check: thick ridges on the spoon.');expect(get().record.intents).toHaveLength(1);expect(first.getAttribute('aria-current')).toBe('true');expect(second.getAttribute('aria-current')).toBeNull();expect(description(first)).toContain('First check');
    second.focus();second.click();expect(document.activeElement).toBe(second);expect(buttons()[0]).toBe(second);expect(second.dataset.avatarHistoryId).toBe(secondId);expect($('avatarReflection').value).toBe('Second check: compare the recorded trail.');
  });

  it('exposes a direct action-notebook navigation link with a focusable visible destination',()=>{
    const link=[...document.querySelectorAll('.avatar-section-nav a')].find(a=>a.textContent==='Action notebook');expect(link).toBeTruthy();expect(link.getAttribute('href')).toBe('#avatarRecordTitle');
    const target=$(link.hash.slice(1));expect(target).not.toBeNull();expect(target.closest('[hidden]')).toBeNull();expect(target.tabIndex).toBe(-1);target.focus();expect(document.activeElement).toBe(target);expect(target.matches('h1,h2,h3,h4,h5,h6')).toBe(true);
  });

  it('keeps saved explanation excerpts as text and leaves the full record intact',()=>{
    start();inspect();const note='<img src=x onerror=alert(1)> '+('A careful recorded observation. '.repeat(20));saveExplanation(note);
    const current=buttons().find(button=>button.getAttribute('aria-current')==='true');expect(description(current)).toContain('<img src=x onerror=alert(1)>');expect($('avatarHistory').querySelector('img,script')).toBeNull();
    current.click();expect($('avatarReflection').value).toBe(note);const stored=JSON.parse(localStorage.getItem(ui.storageKey));expect(stored.current.record.reflection).toBe(note);
  });
});
