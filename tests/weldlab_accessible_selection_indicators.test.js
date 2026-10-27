import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {node,freshTool,mountState,unmountState,click} from './helpers/weldlab_interaction_mount.js';

let fixture;
beforeEach(()=>{freshTool();vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);});
afterEach(async()=>{await unmountState();fixture?.remove();fixture=null;document.body.classList.remove('theme-contrast');vi.restoreAllMocks();});
const retained={car2_reflect:'Keep my reflection.',qp_ans:{0:1},weldBadges:{ppeSafety:true}};
function selectionRule(){const style=document.getElementById('weldlab-selection-css');expect(style).toBeTruthy();const media=[...style.sheet.cssRules];expect(media).toHaveLength(1);expect(media[0].conditionText).toBe('screen');expect(media[0].cssRules).toHaveLength(1);return media[0].cssRules[0];}
function matches(button){return button.matches(selectionRule().selectorText);}
function theme(on){document.body.classList.toggle('theme-contrast',on);}
const q=s=>node().querySelector(s),all=s=>[...node().querySelectorAll(s)];

describe('High-contrast explicit selections remain distinguishable',()=>{
 it('adds a non-color cue without replacing fill, text colors, native focus, border geometry or content',()=>{
  const rule=selectionRule(),style=rule.style;
  expect(style.getPropertyValue('border-color')).toBe('rgb(255, 255, 255)');
  expect(style.getPropertyValue('text-decoration-line')).toBe('underline');
  expect(style.getPropertyValue('text-decoration-style')).toBe('solid');
  expect(style.getPropertyValue('text-decoration-thickness')).toBe('2px');
  expect(style.getPropertyValue('text-underline-offset')).toBe('3px');
  for(const property of ['border-color','text-decoration-line','text-decoration-style','text-decoration-thickness','text-underline-offset'])expect(style.getPropertyPriority(property)).toBe('important');
  for(const property of ['background','background-color','color','outline','box-shadow','border-width','padding','margin','width','height','content'])expect(style.getPropertyValue(property)).toBe('');
 });
 it('limits selection styling to explicit true button states within Weld Lab in the contrast theme',()=>{
  fixture=document.createElement('div');fixture.innerHTML='<button id="outside" aria-pressed="true">Outside</button><div data-weld-view="test"><button id="pressed" aria-pressed="true">Pressed</button><button id="tab" role="tab" aria-selected="true">Tab</button><button id="radio" role="radio" aria-checked="true">Radio</button><button id="false" aria-pressed="false">False</button><button id="mixed" aria-pressed="mixed">Mixed</button><button id="answer" data-correct="true" aria-checked="false">Unchosen answer</button><input id="native" type="checkbox" aria-checked="true" checked></div>';document.body.append(fixture);
  const selected=()=>[...fixture.querySelectorAll('button')].filter(el=>el.matches(selectionRule().selectorText)).map(el=>el.id);
  expect(selected()).toEqual([]);theme(true);expect(selected()).toEqual(['pressed','tab','radio']);
  theme(false);expect(selected()).toEqual([]);expect(fixture.querySelector('#native').checked).toBe(true);
 });
 it.each([false,true])('tracks native section button selection without altering reader contents, focus or saved work, contrast=%s',async contrast=>{
  theme(contrast);const app=await mountState({...retained,view:'codes',insp2_codesTab:'read',codes_pick:'d1_1'},contrast),before=structuredClone(app.latest());
  const buttons=all('[data-code-reader-section]');expect(buttons.length).toBeGreaterThan(2);
  for(const at of [1,buttons.length-1,0]){const target=buttons[at];target.focus();await click(target);expect(document.activeElement).toBe(target);expect(target.getAttribute('aria-pressed')).toBe('true');expect(q('[data-code-reader-reading]').dataset.number).toBe(target.dataset.codeReaderSection);for(const button of buttons)expect(matches(button)).toBe(contrast&&button===target);}
  expect(app.latest()).toEqual(before);expect(app.writes).toHaveLength(0);
 });
 it.each([false,true])('follows existing tab selection and keeps the chosen tab operable, contrast=%s',async contrast=>{
  theme(contrast);const app=await mountState({...retained,view:'ppeSafety',ps_view:'gear'},contrast),tabs=all('[data-weld-tabset="ppe"] [role="tab"]');expect(tabs.length).toBeGreaterThan(1);
  const target=tabs.find(button=>button.getAttribute('aria-selected')==='false');target.focus();await click(target);expect(document.activeElement).toBe(target);expect(target.getAttribute('aria-selected')).toBe('true');expect(target.tabIndex).toBe(0);expect(q('#weld-ppe-panel').getAttribute('aria-labelledby')).toBe(target.id);
  for(const tab of tabs)expect(matches(tab)).toBe(contrast&&tab===target);expect(app.latest()).toMatchObject(retained);
 });
 it.each([false,true])('styles only the chosen inspection sample without exposing an uncommitted finding, contrast=%s',async contrast=>{
  theme(contrast);const app=await mountState({...retained,view:'defectHunt'},contrast),radios=all('[role="radiogroup"][aria-label="Select sample to inspect"] [role="radio"]');expect(radios.length).toBeGreaterThan(1);
  const target=radios[1];target.focus();await click(target);expect(document.activeElement).toBe(target);expect(target.getAttribute('aria-checked')).toBe('true');
  for(const radio of radios)expect(matches(radio)).toBe(contrast&&radio===target);expect(q('[data-hunt-review]').dataset.huntReview).toBe('empty');expect(q('[data-hunt-review-truth]')).toBeNull();expect(app.latest().defectCatalog).toBeUndefined();expect(app.latest()).toMatchObject(retained);
 });
});
