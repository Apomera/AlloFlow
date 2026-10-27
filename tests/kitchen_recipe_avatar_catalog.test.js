// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),M=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js');
const source=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar_catalog.js','utf8');
let catalog,choose;
const host=()=>document.getElementById('catalogHost'),card=id=>host().querySelector('[data-avatar-catalog-activity="'+id+'"]'),filter=id=>host().querySelector('[data-avatar-catalog-filter="'+id+'"]');
function mount(selected='avatar-sauce-rescue',extra={}){catalog=window.KitchenAvatarCatalog.mount({container:host(),catalogue:M.activities,onChoose:choose,getSelected:()=>selected,...extra});return catalog;}
function visibleCards(){return [...host().querySelectorAll('[data-avatar-catalog-activity]')].filter(button=>!button.hidden);}
beforeEach(()=>{document.body.innerHTML='<div id="catalogHost"><span id="existing">Existing host content</span></div>';localStorage.clear();sessionStorage.clear();choose=vi.fn();window.eval(source);});
afterEach(()=>{catalog?.destroy();vi.restoreAllMocks();document.body.replaceChildren();});

describe('Optional chef activity discovery stages an explicit next attempt',()=>{
  it('opens collapsed with the supplied draft and real catalogue titles',()=>{
    mount('hold-and-recheck-sauce');expect(catalog.element.open).toBe(false);expect(catalog.element.querySelector('summary').textContent).toContain('Browse 21 kitchen activities');expect(catalog.getSelected()).toBe('hold-and-recheck-sauce');expect(filter('sauce').getAttribute('aria-pressed')).toBe('true');expect(visibleCards()).toHaveLength(6);expect(card('hold-and-recheck-sauce').getAttribute('aria-pressed')).toBe('true');
    for(const entry of M.activities)expect(card(entry.id).querySelector('.avatar-catalog-card-title').textContent).toBe(entry.title);
    expect(host().textContent).toContain('Ingredients and results do not carry between activities');expect(choose).not.toHaveBeenCalled();
  });
  it('makes all twenty independent setups reachable through all and each category',()=>{
    mount();const expected={prepare:5,cook:9,sauce:6,serve:1},found=[];
    for(const [group,count] of Object.entries(expected)){filter(group).click();expect(visibleCards()).toHaveLength(count);expect(visibleCards().every(button=>button.dataset.category===group)).toBe(true);found.push(...visibleCards().map(button=>button.dataset.avatarCatalogActivity));}
    expect(new Set(found).size).toBe(21);filter('all').click();expect(visibleCards()).toHaveLength(21);expect(choose).not.toHaveBeenCalled();expect(catalog.getSelected()).toBe('avatar-sauce-rescue');
  });
  it('previews one real supplied setup and invokes only selection, never starting a session',()=>{
    const original=JSON.stringify(M.activities);mount();filter('prepare').click();card('pasta-weighing').click();
    expect(choose).toHaveBeenCalledTimes(1);expect(choose).toHaveBeenCalledWith('pasta-weighing');expect(catalog.getSelected()).toBe('pasta-weighing');expect(card('pasta-weighing').getAttribute('aria-pressed')).toBe('true');expect(card('avatar-sauce-rescue').getAttribute('aria-pressed')).toBe('false');
    const entry=M.activities.find(value=>value.id==='pasta-weighing'),preview=host().querySelector('.avatar-catalog-preview');expect(preview.querySelector('h3').textContent).toBe(entry.title);expect(preview.textContent).toContain(entry.description);expect(preview.querySelector('.avatar-catalog-setup>p').textContent).toBe(entry.initialSetup);expect(preview.querySelector('details').open).toBe(false);expect(host().querySelector('[role=status]').textContent).toContain('Use Start a fresh attempt');expect(JSON.stringify(M.activities)).toBe(original);expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);
  });
  it('keeps native buttons, accessible filter states, decorative icons and explicit setup disclosure',()=>{
    mount();expect(catalog.element.querySelector('summary').tagName).toBe('SUMMARY');for(const button of host().querySelectorAll('button')){expect(button.type).toBe('button');expect(button.getAttribute('tabindex')).toBeNull();}for(const button of host().querySelectorAll('[data-avatar-catalog-filter],[data-avatar-catalog-activity]'))expect(button.getAttribute('aria-pressed')).toMatch(/^(true|false)$/);
    const grid=host().querySelector('.avatar-catalog-grid');for(const button of host().querySelectorAll('[data-avatar-catalog-filter]'))expect(button.getAttribute('aria-controls')).toBe(grid.id);
    for(const svg of host().querySelectorAll('svg')){expect(svg.getAttribute('aria-hidden')).toBe('true');expect(svg.getAttribute('focusable')).toBe('false');}
    const target=card('tomato-texture');target.focus();target.click();expect(document.activeElement).toBe(target);expect(host().querySelector('[role=status]').getAttribute('aria-live')).toBe('polite');
  });
  it('keeps selected draft and preview while browsing a different category',()=>{
    mount('hold-and-recheck-sauce');filter('prepare').click();expect(catalog.getSelected()).toBe('hold-and-recheck-sauce');expect(card('hold-and-recheck-sauce').hidden).toBe(true);expect(host().querySelector('.avatar-catalog-preview h3').textContent).toBe('Hold and recheck a sauce');expect(choose).not.toHaveBeenCalled();
  });
  it('is idempotent when the parent renders and preserves filter, expanded setup and keyboard focus',()=>{
    mount('hold-and-recheck-sauce');catalog.element.open=true;filter('prepare').click();const button=filter('prepare');button.focus();const setup=host().querySelector('.avatar-catalog-setup');setup.open=true;const oldGrid=host().querySelector('.avatar-catalog-grid');
    for(let i=0;i<20;i++)expect(catalog.setSelected('hold-and-recheck-sauce')).toBe(true);
    expect(filter('prepare').getAttribute('aria-pressed')).toBe('true');expect(setup.open).toBe(true);expect(catalog.element.open).toBe(true);expect(document.activeElement).toBe(button);expect(host().querySelector('.avatar-catalog-grid')).toBe(oldGrid);expect(choose).not.toHaveBeenCalled();
  });
  it('synchronizes external select/history changes without choosing or moving focus',()=>{
    mount();filter('prepare').focus();expect(catalog.setSelected('portion-and-plate')).toBe(true);expect(catalog.getSelected()).toBe('portion-and-plate');expect(filter('serve').getAttribute('aria-pressed')).toBe('true');expect(visibleCards()).toEqual([card('portion-and-plate')]);expect(document.activeElement).toBe(filter('prepare'));expect(choose).not.toHaveBeenCalled();filter('all').click();catalog.setSelected('garlic-preparation');expect(filter('all').getAttribute('aria-pressed')).toBe('true');expect(visibleCards()).toHaveLength(21);
  });
  it('ignores invalid selection and does not emit a duplicate choice for the selected card',()=>{
    mount();const before=host().innerHTML;for(const value of ['',null,undefined,'not-an-activity'])expect(catalog.setSelected(value)).toBe(false);expect(host().innerHTML).toBe(before);card('avatar-sauce-rescue').click();expect(choose).not.toHaveBeenCalled();
  });
  it('uses each mount’s own document IDs and removes only its own content and listeners',()=>{
    mount();const orphan=card('tomato-texture'),before=host().querySelector('#existing');const otherHost=document.createElement('div');document.body.append(otherHost);const other=window.KitchenAvatarCatalog.mount({container:otherHost,catalogue:M.activities,onChoose:choose});
    expect(other.element.querySelector('.avatar-catalog-grid').id).not.toBe(catalog.element.querySelector('.avatar-catalog-grid').id);catalog.destroy();catalog.destroy();orphan.click();expect(choose).not.toHaveBeenCalled();expect(catalog.setSelected('tomato-texture')).toBe(false);expect(host().children).toHaveLength(1);expect(host().firstChild).toBe(before);expect(other.element.isConnected).toBe(true);other.destroy();
  });
  it('shows safe plain text from catalogue fields and permits future activities without assigning an invented group',()=>{
    const entry={id:'future-activity',title:'<img src=x onerror=alert(1)>',description:'<script>bad</script>',initialSetup:'<b>Supplied</b>'};mount('future-activity',{catalogue:[entry,entry]});expect(host().querySelectorAll('[data-avatar-catalog-activity]')).toHaveLength(1);expect(filter('other').textContent).toContain('More activities');expect(host().querySelector('img')).toBeNull();expect(host().querySelector('script')).toBeNull();expect(host().querySelector('.avatar-catalog-preview').textContent).toContain(entry.description);expect(host().querySelector('.avatar-catalog-setup>p').textContent).toBe(entry.initialSetup);
  });
  it('handles an empty catalogue without inventing an activity or callback',()=>{
    mount(null,{catalogue:[]});expect(catalog.getSelected()).toBe('');expect(host().querySelector('.avatar-catalog-preview').hidden).toBe(true);expect(visibleCards()).toHaveLength(0);expect(choose).not.toHaveBeenCalled();filter('all').click();expect(host().querySelector('[role=status]').textContent).toContain('0 activities');
  });
  it('keeps each activity name stable and describes its own skills instead of repeating the setup instructions',()=>{
    mount();filter('all').click();
    for(const entry of M.activities){const button=card(entry.id),title=button.querySelector('.avatar-catalog-card-title'),skills=button.querySelector('.avatar-catalog-card-skills');expect(button.getAttribute('aria-labelledby')).toBe(title.id);expect(button.getAttribute('aria-describedby')).toBe(skills.id);expect(document.getElementById(title.id).textContent).toBe(entry.title);expect(document.getElementById(skills.id).textContent.length).toBeGreaterThan(0);}
    const button=card('tomato-texture'),name=button.getAttribute('aria-labelledby');button.click();expect(button.getAttribute('aria-labelledby')).toBe(name);catalog.setSelected('surface-drying');expect(button.getAttribute('aria-labelledby')).toBe(name);
  });
  it('provides the current filter count on opening and updates results without changing the selected activity',()=>{
    mount();const results=host().querySelector('[data-avatar-catalog-results]'),grid=host().querySelector('.avatar-catalog-grid');expect(results.textContent).toBe('6 activities shown in Sauce.');expect(grid.getAttribute('aria-describedby').split(' ')).toContain(results.id);filter('serve').click();expect(results.textContent).toBe('1 activity shown in Serve.');expect(results.dataset.count).toBe('1');expect(host().querySelector('[role=status]').textContent).toContain(results.textContent);expect(catalog.getSelected()).toBe('avatar-sauce-rescue');filter('all').click();expect(results.textContent).toBe('21 activities shown.');
  });
  it('moves focus only when a synchronized selection hides the focused card',()=>{
    mount();catalog.element.open=true;const old=card('avatar-sauce-rescue');old.focus();catalog.setSelected('pasta-weighing');expect(old.hidden).toBe(true);expect(document.activeElement).toBe(card('pasta-weighing'));filter('all').click();old.focus();catalog.setSelected('garlic-preparation');expect(old.hidden).toBe(false);expect(document.activeElement).toBe(old);expect(choose).not.toHaveBeenCalled();
    const outside=document.createElement('button');document.body.append(outside);outside.focus();catalog.setSelected('hold-and-recheck-sauce');expect(document.activeElement).toBe(outside);
  });
  it('does not rewrite an unchanged filter or selection announcement during repeated owner renders',()=>{
    mount();filter('prepare').click();const status=host().querySelector('[role=status]'),observer=new MutationObserver(()=>{});observer.observe(status,{childList:true,subtree:true,characterData:true});for(let i=0;i<20;i++){filter('prepare').click();catalog.setSelected('avatar-sauce-rescue');}expect(observer.takeRecords()).toEqual([]);card('pasta-weighing').click();expect(observer.takeRecords()).toHaveLength(1);for(let i=0;i<20;i++){card('pasta-weighing').click();catalog.setSelected('pasta-weighing');}expect(observer.takeRecords()).toEqual([]);observer.disconnect();
  });
  it('clears an earlier selection announcement when the owner synchronizes a different draft',()=>{
    mount();card('tomato-texture').click();const status=host().querySelector('[role=status]');expect(status.textContent).toContain('Tomato texture');catalog.setSelected('pasta-weighing');expect(status.textContent).toBe('');expect(catalog.getSelected()).toBe('pasta-weighing');expect(host().querySelector('[data-avatar-catalog-results]').textContent).toBe('5 activities shown in Prepare.');
  });
});
