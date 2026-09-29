import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('life_skills_outing/life_skills_outing.html', 'utf8');
const scripts = ['engine.js', 'ai.js', 'outing.js'].map(name => readFileSync('life_skills_outing/' + name, 'utf8'));
const windows = [];
const activeKey = 'alloflow-life-outing-active:v1';
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

function mount({ saved = [], provider, noScene = false, noStorage = false } = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost:3000/life_skills_outing/life_skills_outing.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; windows.push(w);
  if (noStorage) Object.defineProperty(w, 'localStorage', { get() { throw Error('Storage blocked'); } });
  else for (const [key, value] of saved) w.localStorage.setItem(key, value);
  // Rendering is verified in real Chromium. These stubs leave real DOM event handlers intact.
  if (!noScene) w.AFRAME = {};
  w.HTMLCanvasElement.prototype.getContext = () => ({ fillRect() {}, fillText() {}, measureText: text => ({ width: text.length * 20 }) });
  w.eval(scripts[0]); w.eval(scripts[1]);
  if (provider) w.AlloOutingAI = { createClient: () => ({ available: () => true, request: provider, destroy() {} }) };
  w.eval(scripts[2]);
  const $ = selector => w.document.querySelector(selector);
  return {
    w, $, E: w.AlloOutingEngine,
    run: () => JSON.parse(w.localStorage.getItem(w.localStorage.getItem(activeKey))),
    save: () => Array.from({ length: w.localStorage.length }, (_, i) => { const k = w.localStorage.key(i); return [k, w.localStorage.getItem(k)]; }),
    station: name => { const b = [...w.document.querySelectorAll('#stationNavigation button')].find(el => el.textContent.includes(name)); if (!b) throw Error(name); b.click(); },
    act: (id, source = 'button') => { const el = $((source === 'scene' ? '#sceneActionButtons ' : '#actionList ') + '[data-action="' + id + '"]'); if (!el || el.disabled) throw Error('Unavailable: ' + id); if (source === 'scene') el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); else { el.focus(); el.click(); } }
  };
}
afterEach(() => { for (const w of windows.splice(0)) { w.dispatchEvent(new w.Event('beforeunload')); w.close(); } });

function complete(h, source = 'button') {
  h.station('Wardrobe'); h.act('wear_ready', source);
  h.station('Kitchen'); h.act('fill_water', source); h.act('pack_water', source);
  h.station('Doorway'); h.act('pack_document', source); h.act('pack_raincoat', source);
  h.station('Travel'); h.act('choose_bus', source); h.act('depart', source);
}

function chooseReview(h, revision) {
  h.$('#reviewChoice').value=String(revision);
  h.$('#reviewChoice').dispatchEvent(new h.w.Event('change'));
}
function addPlan(h,id) {
  h.$('#planAction').value=id;
  h.$('#planForm').dispatchEvent(new h.w.Event('submit',{bubbles:true,cancelable:true}));
}
async function openBackup(h, source) {
  const file=new h.w.File([source], 'practice.json', {type:'application/json'});
  Object.defineProperty(h.$('#restoreFile'),'files',{configurable:true,value:[file]});
  h.$('#restoreFile').dispatchEvent(new h.w.Event('change'));
  await vi.waitFor(()=>expect(h.$('#backupStatus').textContent).not.toContain('Opening your practice'),{timeout:4000,interval:10});
}

describe('Life Skills outing interaction', () => {
  it('compares wardrobe choices and route timing without saving, acting or changing the room', () => {
    let calls = 0;
    const h = mount({ provider: () => { calls++; return Promise.resolve({ text: 'Hello.', status: 'generated' }); } });
    h.station('Travel'); h.act('choose_walk'); h.station('Wardrobe'); const saved = h.save();
    h.$('#openWardrobe').click();
    expect(h.$('#wardrobeWorkbench').open).toBe(true);
    expect(h.w.document.activeElement.dataset.outfit).toBe('wear_ready');
    h.$('[data-outfit="wear_ready"]').click();
    expect(h.$('#wardrobeClock').textContent).toContain('09:00 → clothes ready 09:02 · 2 minutes');
    expect(h.$('[data-outfit-route="walk"]').textContent).toContain('Arrive 09:20');
    expect(h.$('[data-outfit-route="walk"]').textContent).toContain('Chosen in outing');
    expect(h.$('#wardrobeStatus').textContent).toContain('practice clock stays 09:00');
    h.$('[data-outfit="prepare_clothes"]').click();
    expect(h.$('#wardrobeClock').textContent).toContain('09:00 → clothes ready 09:08 · 8 minutes');
    expect(h.$('[data-outfit-route="walk"]').textContent).toContain('Arrive 09:26');
    expect(h.$('[data-outfit-route="walk"]').textContent).toContain('9 min before the start');
    expect(h.$('[data-outfit="prepare_clothes"]').getAttribute('aria-pressed')).toBe('true');
    expect(h.w.document.activeElement.id).toBe('prepareOutfit');
    expect(h.$('#shirtObject a-box').getAttribute('color')).toBe('#f3d27f');
    expect(h.$('#clothesFolded').getAttribute('visible')).toBe('false');
    expect(h.save()).toEqual(saved); expect(calls).toBe(0);
    expect(h.$('#wardrobePreviewResult').textContent).toContain('Allow time for your other preparation');
  });
  it.each([['wear_ready', 2], ['prepare_clothes', 8]])('prepares %s once and continues to a complete outing with %s minutes spent on clothes', (id, minutes) => {
    const h = mount(); h.$('#supportSelect').value = 'independent';
    h.$('#settingsForm').dispatchEvent(new h.w.Event('submit', { cancelable: true }));
    h.station('Wardrobe'); h.$('#openWardrobe').click(); h.$('[data-outfit="' + id + '"]').click(); h.$('#prepareOutfit').click();
    expect(h.run().commands.map(c => c.actionId)).toEqual([id]);
    expect(h.$('#clock').textContent).toBe('09:0' + minutes);
    expect(h.$('#wardrobeReady').hidden).toBe(false); expect(h.$('#wardrobeOptions').hidden).toBe(true);
    expect(h.$('#wardrobeReadyCopy').textContent).toContain(minutes + ' min');
    expect(h.w.document.activeElement.id).toBe('wardrobeReadyTitle');
    expect(h.$('#shirtObject a-box').getAttribute('color')).toBe('#659884');
    h.$('#prepareOutfit').dispatchEvent(new h.w.MouseEvent('click')); expect(h.run().commands).toHaveLength(1);
    h.$('#wardrobeToBag').click(); expect(h.$('#packingWorkbench').open).toBe(true);
    h.station('Kitchen'); h.act('fill_water'); h.act('pack_water');
    h.station('Doorway'); h.act('pack_document'); h.act('pack_raincoat');
    h.station('Travel'); h.act('choose_walk'); h.act('depart');
    const view = h.E.view(h.run()); expect(view.completed).toBe(true);
    expect(view.clock).toBe(minutes === 2 ? '09:24' : '09:30');
    expect(h.run().commands.some(c => c.actionId === 'hint')).toBe(false);
  });
  it('keeps an unannounced bus delay out of wardrobe examples and announces the real update after preparation', () => {
    const h = mount(); h.$('#scenarioSelect').value = 'bus-delay';
    h.$('#settingsForm').dispatchEvent(new h.w.Event('submit', { cancelable: true }));
    h.act('fill_water'); h.station('Doorway'); h.act('pack_document');
    h.station('Wardrobe'); h.$('#openWardrobe').click(); const saved = h.save();
    h.$('[data-outfit="prepare_clothes"]').click();
    expect(h.$('#wardrobeClock').textContent).toContain('09:02 → clothes ready 09:10');
    expect(h.$('[data-outfit-route="bus"]').textContent).toContain('Arrive 09:30');
    expect(h.$('#wardrobeKnowledge').textContent).toContain('updates may change your plan');
    expect(h.$('#eventCard').hidden).toBe(true); expect(h.save()).toEqual(saved);
    h.$('#prepareOutfit').click();
    expect(h.E.materialize(h.run()).busDelayed).toBe(true);
    expect(h.$('#eventCard').hidden).toBe(false);
    expect(h.$('#announcer').textContent).toContain('09:45');
    expect(h.$('#wardrobePreviewResult').hidden).toBe(true);
    h.$('#sameReplayButton').click(); h.act('fill_water'); h.act('pack_water');
    h.station('Doorway'); h.act('pack_document'); h.station('Wardrobe'); h.$('#openWardrobe').click(); h.$('[data-outfit="wear_ready"]').click();
    expect(h.$('[data-outfit-route="bus"]').textContent).toContain('Arrive 09:45');
    expect(h.$('[data-outfit-route="bus"]').textContent).toContain('10 min after the start');
    expect(h.$('#wardrobeKnowledge').textContent).toContain('latest forecast and travel updates');
  });
  it('opens from room clothes and clears wardrobe examples after navigation, actual scene choices, resume and replay', () => {
    const h = mount(); h.$('#shirtObject').dispatchEvent(new h.w.MouseEvent('click', { bubbles: true }));
    expect(h.$('#wardrobeWorkbench').open).toBe(true); h.$('[data-outfit="prepare_clothes"]').click();
    h.station('Kitchen'); expect(h.$('#wardrobePreviewResult').hidden).toBe(true);
    h.$('#prepareOutfit').dispatchEvent(new h.w.MouseEvent('click')); expect(h.run().commands).toHaveLength(0);
    h.station('Wardrobe'); h.$('#openWardrobe').click(); h.$('[data-outfit="wear_ready"]').click();
    h.$('#resumeButton').click(); expect(h.$('#wardrobeWorkbench').open).toBe(false);
    h.station('Wardrobe'); h.$('#openWardrobe').click(); expect(h.$('#prepareOutfit').disabled).toBe(true);
    h.$('[data-outfit="prepare_clothes"]').click(); h.$('#sameReplayButton').click();
    h.station('Wardrobe'); h.$('#openWardrobe').click(); expect(h.$('#wardrobePreviewResult').hidden).toBe(true);
    h.$('[data-outfit="prepare_clothes"]').click(); h.act('wear_ready', 'scene');
    expect(h.$('#wardrobeReady').hidden).toBe(false); expect(h.$('#prepareOutfit').disabled).toBe(true);
    expect(h.$('#wardrobeStatus').textContent).toBe('');
    expect(h.run().commands.map(c => c.actionId)).toEqual(['wear_ready']);
  });
  it('shows the actual clothing decision after resume and supports unavailable 3D or storage', () => {
    const h = mount(); h.station('Wardrobe'); h.act('prepare_clothes');
    const resumed = mount({ saved: h.save() }); resumed.station('Wardrobe'); resumed.$('#openWardrobe').click();
    expect(resumed.$('#wardrobeReadyCopy').textContent).toContain('Finish drying the other outfit · 8 min');
    expect(resumed.$('#wardrobeReadyCopy').textContent).toContain('09:08');
    expect(resumed.w.document.activeElement.id).toBe('wardrobeReadyTitle');
    const offline = mount({ noScene: true, noStorage: true }); offline.station('Wardrobe'); offline.$('#openWardrobe').click();
    offline.$('[data-outfit="prepare_clothes"]').click(); expect(offline.$('#clock').textContent).toBe('09:00');
    offline.$('#prepareOutfit').click(); expect(offline.$('#clock').textContent).toBe('09:08');
    const done = mount(); complete(done); const saved = done.save();
    done.station('Wardrobe'); done.$('#openWardrobe').click(); done.$('#prepareOutfit').dispatchEvent(new done.w.MouseEvent('click'));
    expect(done.$('#openWardrobe').hidden).toBe(true); expect(done.$('#wardrobeWorkbench').hidden).toBe(true);
    expect(done.save()).toEqual(saved);
  });
  it('packs an object at the bag table using the real action while selection stays untimed and unsaved', () => {
    let calls = 0;
    const h = mount({ provider: () => { calls++; return Promise.resolve({ text: 'Hello.', status: 'generated' }); } });
    h.act('fill_water'); const saved = h.save();
    h.$('#openPacking').click();
    expect(h.$('#packingWorkbench').open).toBe(true);
    expect(h.w.document.activeElement.dataset.packItem).toBe('bottle');
    h.$('[data-pack-item="bottle"]').click();
    expect(h.$('[data-pack-item="bottle"]').getAttribute('aria-pressed')).toBe('true');
    expect(h.w.document.activeElement.id).toBe('packingPlace');
    expect(h.$('#bottleObject').getAttribute('position')).toBe('-2.1 1.32 -1.8');
    expect(h.save()).toEqual(saved); expect(calls).toBe(0);
    h.$('#packingPlace').click();
    expect(h.run().commands.map(c => c.actionId)).toEqual(['fill_water', 'pack_water']);
    expect(h.$('#clock').textContent).toBe('09:02');
    expect(h.$('#bottleObject').getAttribute('position')).toBe('2.08 1.05 -1.61');
    expect(h.$('#packingContents').textContent).toContain('Filled water bottle · packed');
    expect(h.$('#packingCount').textContent).toBe('1 of 3 packed');
    expect(h.$('[data-pack-item="bottle"]').disabled).toBe(true);
    expect(h.$('#packingPlace').disabled).toBe(true);
    expect(h.w.document.activeElement.dataset.packItem).toBe('card');
    expect(h.$('#packingWorkbench').open).toBe(true);
    expect(h.$('#packingStatus').textContent).toBe(''); expect(calls).toBe(0);
  });
  it('rejects an empty bottle and offers a deliberate fill step without changing the outing', () => {
    const h = mount(); const saved = h.save();
    h.$('#openPacking').click(); h.$('[data-pack-item="bottle"]').click(); h.$('#packingPlace').click();
    expect(h.$('#packingStatus').textContent).toBe('Fill the bottle before packing it.');
    expect(h.$('#packingFill').hidden).toBe(false);
    expect(h.$('#packingCount').textContent).toBe('0 of 3 packed');
    expect(h.save()).toEqual(saved); expect(h.$('#clock').textContent).toBe('09:00');
    h.$('#packingFill').click();
    expect(h.$('#stationTitle').textContent).toBe('Kitchen');
    expect(h.$('#objectTitle').textContent).toBe('Water bottle');
    expect(h.w.document.activeElement.dataset.action).toBe('fill_water');
    expect(h.save()).toEqual(saved);
    h.act('fill_water'); h.$('#openPacking').click();
    expect(h.$('[data-pack-item="bottle"]').textContent).toContain('Filled · on the counter');
    h.$('[data-pack-item="bottle"]').click(); h.$('#packingPlace').click();
    expect(h.E.materialize(h.run()).bottlePacked).toBe(true);
    expect(h.run().commands).toHaveLength(2);
  });
  it.each(['rain', 'warm'])('uses received %s weather and replaces the one weather item without extra packing time', variation => {
    const h = mount(); h.$('#scenarioSelect').value = variation;
    h.$('#settingsForm').dispatchEvent(new h.w.Event('submit', { cancelable: true }));
    h.act('fill_water'); h.$('#openPacking').click();
    expect(h.$('#packingForecast').textContent).toContain('Cloudy · update expected');
    h.$('[data-pack-item="hat"]').click(); h.$('#packingPlace').click();
    expect(h.$('#packingForecast').textContent).toContain('Cloudy · update expected');
    h.$('[data-pack-item="card"]').click(); h.$('#packingPlace').click();
    expect(h.$('#packingForecast').textContent).toContain('Updated: ' + (variation === 'rain' ? 'rain' : 'warm sunshine'));
    expect(h.$('#announcer').textContent).toContain('forecast');
    const clock = h.$('#clock').textContent;
    h.$('[data-pack-item="raincoat"]').click(); h.$('#packingPlace').click();
    expect(h.$('#clock').textContent).toBe(clock);
    expect(h.$('#packingCount').textContent).toBe('2 of 3 packed');
    expect(h.$('#packingContents').textContent).toContain('Raincoat · packed');
    expect(h.$('#packingContents').textContent).not.toContain('Sun hat · packed');
    expect(h.$('[data-pack-item="hat"]').disabled).toBe(false);
    expect(h.$('[data-pack-item="hat"]').textContent).toContain('On the hook');
    expect(h.$('#hatObject').getAttribute('position')).toBe('0 0 0');
    expect(h.$('#weatherObject').getAttribute('position')).toBe('1 .1 0');
    h.$('[data-pack-item="hat"]').click(); h.$('#packingPlace').click();
    expect(h.$('#clock').textContent).toBe(clock);
    expect(h.$('#weatherObject').getAttribute('position')).toBe('0 0 0');
    expect(h.$('#hatObject').getAttribute('position')).toBe('.5 .05 0');
    expect(h.E.view(h.run()).inventory.filter(item => ['hat', 'raincoat'].includes(item.id))).toHaveLength(1);
    expect(h.run().commands.map(c => c.actionId)).toEqual(['fill_water', 'pack_hat', 'pack_document', 'pack_raincoat', 'pack_hat']);
  });
  it('opens from the room bag and clears scratch selections after navigation, scene actions, resume and replay', () => {
    const h = mount();
    h.$('#bagObject').dispatchEvent(new h.w.MouseEvent('click', { bubbles: true }));
    expect(h.$('#packingWorkbench').hidden).toBe(false);
    expect(h.$('#packingWorkbench').open).toBe(true); h.$('[data-pack-item="card"]').click();
    h.station('Kitchen');
    expect(h.$('#packingWorkbench').hidden).toBe(true); expect(h.$('#packingPlace').disabled).toBe(true);
    h.$('#openPacking').click(); h.$('[data-pack-item="hat"]').click(); h.act('pack_document', 'scene');
    expect(h.$('#packingPlace').disabled).toBe(true);
    h.$('#packingPlace').dispatchEvent(new h.w.MouseEvent('click'));
    expect(h.run().commands).toHaveLength(1);
    h.$('[data-pack-item="hat"]').click(); h.$('#resumeButton').click();
    expect(h.$('#packingWorkbench').open).toBe(false); expect(h.$('#packingStatus').textContent).toBe('');
    h.$('#openPacking').click(); expect(h.$('[aria-pressed="true"][data-pack-item]')).toBe(null);
    h.$('[data-pack-item="hat"]').click(); h.$('#sameReplayButton').click();
    h.$('#openPacking').click(); expect(h.$('#packingPlace').disabled).toBe(true);
    expect(h.run().commands).toHaveLength(0);
  });
  it('keeps packing usable without storage or 3D and guards completed outings', () => {
    const offline = mount({ noScene: true, noStorage: true });
    offline.$('#openPacking').click(); offline.$('[data-pack-item="card"]').click(); offline.$('#packingPlace').click();
    expect(offline.$('#packingContents').textContent).toContain('booking card · packed');
    expect(offline.$('#clock').textContent).toBe('09:01');
    const h = mount(); complete(h); const saved = h.save();
    h.$('#openPacking').click(); h.$('#packingPlace').dispatchEvent(new h.w.MouseEvent('click'));
    h.station('Doorway'); h.$('[data-inspect="bag"]').click();
    expect(h.$('#packingWorkbench').hidden).toBe(true); expect(h.$('#openPacking').hidden).toBe(true);
    expect(h.save()).toEqual(saved);
  });
  it('completes a work outing with independent coaching using the bag table for every packed item', () => {
    const h = mount(); h.$('#contextSelect').value = 'work'; h.$('#supportSelect').value = 'independent';
    h.$('#settingsForm').dispatchEvent(new h.w.Event('submit', { cancelable: true }));
    h.station('Wardrobe'); h.act('wear_ready'); h.station('Kitchen'); h.act('fill_water');
    h.$('#openPacking').click();
    expect(h.$('[data-pack-item="card"]').textContent).toContain('orientation card');
    for (const item of ['bottle', 'card', 'raincoat']) {
      h.$('[data-pack-item="' + item + '"]').click(); h.$('#packingPlace').click();
    }
    expect(h.$('#packingCount').textContent).toBe('3 of 3 packed');
    h.station('Travel'); h.act('choose_walk'); h.act('depart');
    const run = h.run(), view = h.E.view(run);
    expect(view.completed).toBe(true); expect(view.clock).toBe('09:24');
    expect(run.commands.map(c => c.actionId)).toEqual(['wear_ready', 'fill_water', 'pack_water', 'pack_document', 'pack_raincoat', 'choose_walk', 'depart']);
    expect(view.observations.map(o => o.skill)).toContain('Preparation sequence');
    expect(h.$('#debrief').hidden).toBe(false);
  });
  it('explores departure times and returns to real choices without saving or acting',()=>{
    let calls=0;const h=mount({provider:()=>{calls++;return Promise.resolve({text:'Hello.',status:'generated'});}});
    const saved=h.save();h.$('#openTravelLab').click();
    expect(h.$('#travelLab').open).toBe(true);
    expect(h.w.document.activeElement.id).toBe('departureTime');
    h.$('#departureTime').value='21';h.$('#departureTime').dispatchEvent(new h.w.Event('input'));
    h.$('#departureTime').dispatchEvent(new h.w.Event('change'));
    expect(h.$('#departureOutput').textContent).toBe('09:21');
    expect(h.$('#travelTimelines [data-route="bus"]').textContent).toContain('Bus missed');
    expect(h.$('#travelTimelines [data-route="late_bus"]').textContent).toContain('19 minutes waiting');
    expect(h.$('#travelLabStatus').textContent).toContain('practice clock stays 09:00');
    expect(h.$('#clock').textContent).toBe('09:00');expect(h.save()).toEqual(saved);expect(calls).toBe(0);
    h.$('#returnToTravel').click();expect(h.w.document.activeElement.id).toBe('stationActions');
    expect(h.$('#stationTitle').textContent).toBe('Travel plan');expect(h.run().commands).toHaveLength(0);
    expect(h.$('#travelPreview').textContent).toContain('Choose a route');
  });
  it('offers keyboard buttons, clamps the bounds and resets to the current preparation time',()=>{
    const h=mount();h.act('fill_water');h.$('#openTravelLab').click();
    expect(h.$('#departureTime').min).toBe('1');expect(h.$('#earlierDeparture').disabled).toBe(true);
    h.$('#laterDeparture').click();expect(h.$('#departureOutput').textContent).toBe('09:02');
    h.$('#earlierDeparture').focus();h.$('#earlierDeparture').click();
    expect(h.$('#departureOutput').textContent).toBe('09:01');expect(h.w.document.activeElement.id).toBe('departureTime');
    h.$('#departureTime').value='59';h.$('#departureTime').dispatchEvent(new h.w.Event('input'));
    h.$('#laterDeparture').focus();h.$('#laterDeparture').click();
    expect(h.$('#departureOutput').textContent).toBe('10:00');expect(h.$('#laterDeparture').disabled).toBe(true);
    expect(h.w.document.activeElement.id).toBe('departureTime');
    h.$('#resetDeparture').click();expect(h.$('#departureOutput').textContent).toBe('09:01');
    expect(h.$('#resetDeparture').disabled).toBe(true);expect(h.run().commands).toHaveLength(1);
  });
  it('explains preparation separately and gives concise timing announcements',()=>{
    const h=mount();expect(h.$('#travelTimeNote').textContent).toContain('Finish preparing');
    h.$('#departureTime').value='19';h.$('#departureTime').dispatchEvent(new h.w.Event('change'));
    expect(h.$('#travelLabStatus').textContent).toContain('2 of 4 routes arrive by 09:35');
    expect(h.$('#travelTimelines [data-route="ride"]').textContent).toContain('1 minute before');
    expect(h.$('#travelTimelines [data-route="bus"]').textContent).toContain('1 minute waiting');
    expect(h.$('#departureTime').getAttribute('aria-valuetext')).toBe('09:19 example departure');
    h.station('Wardrobe');h.act('wear_ready');h.station('Kitchen');h.act('fill_water');h.act('pack_water');
    h.station('Doorway');h.act('pack_document');h.act('pack_raincoat');
    expect(h.$('#travelTimeNote').textContent).toContain('Your clothes and bag are ready');
    expect(h.run().commands).toHaveLength(5);expect(h.$('#travelPreview').textContent).toContain('Choose a route');
  });
  it('refreshes the explorer after an actual action and uses a received bus delay',()=>{
    const h=mount();h.$('#scenarioSelect').value='bus-delay';h.$('#settingsForm').dispatchEvent(new h.w.Event('submit',{cancelable:true}));
    h.$('#departureTime').value='15';h.$('#departureTime').dispatchEvent(new h.w.Event('input'));
    expect(h.$('#travelTimelines [data-route="bus"]').textContent).toContain('Arrive 09:30');
    h.act('fill_water');expect(h.$('#departureOutput').textContent).toBe('09:01');
    h.act('pack_water');h.station('Wardrobe');h.act('wear_ready');
    expect(h.$('#departureOutput').textContent).toBe('09:04');
    expect(h.$('#travelTimelines [data-route="bus"]').textContent).toContain('25 minutes of travel');
    expect(h.$('#travelTimelines [data-route="bus"]').textContent).toContain('Arrive 09:45');
    expect(h.$('#travelKnowledge').textContent).toContain('latest forecast');
    h.station('Travel');h.act('choose_ride');
    expect(h.$('#travelTimelines [data-route="ride"] .timeline-selected').textContent).toBe('Chosen in outing');
  });
  it('keeps the completed outcome intact and starts a replay with a fresh explorer',()=>{
    const h=mount();complete(h);const saved=h.save();h.$('#openTravelLab').click();
    expect(h.$('#departureOutput').textContent).toBe('09:06');
    expect(h.$('#travelTimeNote').textContent).toContain('departed at 09:06 and arrived at 09:30');
    h.$('#laterDeparture').click();expect(h.$('#clock').textContent).toBe('09:30');expect(h.save()).toEqual(saved);
    h.$('#sameReplayButton').click();expect(h.$('#travelLab').open).toBe(false);
    expect(h.$('#departureOutput').textContent).toBe('09:00');expect(h.$('#travelLabStatus').textContent).toBe('');
  },15000);
  it('keeps timing exploration available without storage or 3D',()=>{
    const h=mount({noStorage:true,noScene:true});h.station('Travel');h.$('#exploreTravel').click();
    h.$('#laterDeparture').click();expect(h.$('#departureOutput').textContent).toBe('09:01');
    expect(h.$('#clock').textContent).toBe('09:00');expect(h.$('#travelTimelines').children).toHaveLength(4);
  });
  it('rehearses an action and prediction, then takes that action only when requested',()=>{
    let calls=0;const h=mount({provider:()=>{calls++;return Promise.resolve({text:'Hello.',status:'generated'});}});
    h.$('#rehearsal').open=true;h.$('#prediction').value='The bottle fills but still needs packing.';
    const saved=h.save();h.$('#previewActionButton').click();
    expect(h.$('#rehearsalPrediction').textContent).toContain('still needs packing');
    expect(h.$('#rehearsalChanges').textContent).toContain('09:0009:01');
    expect(h.$('#clock').textContent).toBe('09:00');
    expect(h.save()).toEqual(saved);
    expect(h.w.document.activeElement.id).toBe('rehearsalTitle');
    expect(calls).toBe(0);
    h.$('#takeRehearsedAction').click();
    expect(h.run().commands.map(command=>command.actionId)).toEqual(['fill_water']);
    expect(h.$('#clock').textContent).toBe('09:01');
    expect(h.$('#rehearsalResult').hidden).toBe(true);
    expect(h.w.document.activeElement.dataset.action).toBe('pack_water');
  });
  it('clears a rehearsal after an actual scene action or a station change',()=>{
    const h=mount();h.$('#previewActionButton').click();
    h.act('fill_water','scene');h.$('#takeRehearsedAction').click();
    expect(h.run().commands).toHaveLength(1);
    expect(h.$('#rehearsalStatus').textContent).toContain('outing changed');
    h.$('#previewActionButton').click();expect(h.$('#rehearsalResult').hidden).toBe(false);
    h.station('Wardrobe');expect(h.$('#rehearsalResult').hidden).toBe(true);
    expect(h.$('#prediction').value).toBe('');
    expect(h.$('#rehearsalAction').value).toBe('wear_ready');
  });
  it('uses inert prediction text and sets aside a preview when the prediction is edited',()=>{
    const h=mount();h.$('#prediction').value='<img src=x onerror=alert(1)>';
    h.$('#previewActionButton').click();
    expect(h.$('#rehearsalPrediction').textContent).toContain('<img');
    expect(h.$('#rehearsalResult img')).toBeNull();
    h.$('#prediction').value='A different idea.';h.$('#prediction').dispatchEvent(new h.w.Event('input'));
    expect(h.$('#rehearsalResult').hidden).toBe(true);
    expect(h.run().commands).toHaveLength(0);
  });
  it('supports rehearsal without storage or 3D and hides it after completion',()=>{
    const offline=mount({noStorage:true,noScene:true});offline.$('#previewActionButton').click();
    expect(offline.$('#rehearsalFeedback').textContent).toContain('bottle is filled');
    expect(offline.$('#clock').textContent).toBe('09:00');
    offline.$('#takeRehearsedAction').click();expect(offline.$('#clock').textContent).toBe('09:01');
    const h=mount();complete(h);expect(h.$('#rehearsal').hidden).toBe(true);
  },15000);
  it('checks and reorders a plan, then opens the action without taking it',()=>{
    const h=mount();addPlan(h,'pack_water');addPlan(h,'fill_water');
    expect(h.run().commands).toHaveLength(0);
    expect(h.$('#planCheck').hidden).toBe(true);
    h.$('#checkPlanButton').click();
    expect(h.$('.plan-problem-text').textContent).toContain('Fill the bottle before packing');
    h.$('#planSteps li:nth-child(2) [data-plan-operation="up"]').click();
    expect(h.w.document.activeElement.closest('li').textContent).toContain('Fill the water bottle');
    expect(h.$('.plan-problem-text')).toBeNull();
    h.$('#nextPlanButton').click();
    expect(h.w.document.activeElement.dataset.action).toBe('fill_water');
    expect(h.$('.planned-badge').textContent).toBe('Next in your plan');
    expect(h.run().commands).toHaveLength(0);
    h.act('fill_water','scene');
    expect(h.$('#planSteps li').textContent).toContain('Done at step 1');
    h.$('#followPlanButton').click();
    expect(h.w.document.activeElement.dataset.action).toBe('pack_water');
    h.$('#planner').open=false;h.$('#editPlanButton').click();
    expect(h.$('#planner').open).toBe(true);
    expect(h.w.document.activeElement).toBe(h.$('#planner summary'));
    expect(h.$('#clock').textContent).toBe('09:01');
  });
  it('updates a checked plan when an actual travel update arrives',()=>{
    const h=mount();h.$('#scenarioSelect').value='bus-delay';h.$('#settingsForm').dispatchEvent(new h.w.Event('submit',{cancelable:true}));
    for(const id of ['fill_water','pack_water','wear_ready','pack_document','pack_raincoat','choose_bus','depart'])addPlan(h,id);
    h.$('#checkPlanButton').click();
    expect(h.$('#planSummary').textContent).toContain('09:30');
    expect(h.$('#planUncertainty').textContent).toContain('may change');
    h.act('fill_water');h.act('pack_water');h.station('Wardrobe');h.act('wear_ready');
    expect(h.$('#planSummary').textContent).toContain('Check 1 planned step');
    expect(h.$('#planSteps').textContent).toContain('route that arrives by 09:35');
    expect(h.$('#planUncertainty').textContent).toContain('latest forecast');
    expect(h.$('#planGuideText').textContent).toContain('1 step to review');
    expect(h.run().commands).toHaveLength(3);
  });
  it('restores a plan and recomputes its progress when a decision is retried',()=>{
    const h=mount();addPlan(h,'wear_ready');h.$('#checkPlanButton').click();h.station('Wardrobe');h.act('wear_ready');
    addPlan(h,'fill_water');
    const restored=mount({saved:h.save()});
    expect(restored.$('#planSteps li').textContent).toContain('Done at step 1');
    expect(restored.$('#planner').open).toBe(true);
    chooseReview(restored,1);restored.$('#retryChoiceButton').click();
    expect(restored.$('#planSteps').children).toHaveLength(1);
    expect(restored.$('#planSteps li').textContent).toContain('Next in your plan');
    expect(restored.$('#planSteps').textContent).not.toContain('Done at step 1');
    expect(restored.$('#planCheck').hidden).toBe(false);
  },15000);
  it('keeps a plan in downloaded backups and can open it without local storage',async()=>{
    const h=mount({noStorage:true,noScene:true});addPlan(h,'fill_water');addPlan(h,'pack_water');h.$('#checkPlanButton').click();
    let blob;h.w.URL.createObjectURL=value=>{blob=value;return 'blob:test';};h.w.URL.revokeObjectURL=()=>{};h.w.HTMLAnchorElement.prototype.click=()=>{};
    h.$('#downloadButton').click();
    const source=await new Promise(resolve=>{const reader=new h.w.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});
    expect(h.E.readBackup(source).plan.steps.map(step=>step.actionId)).toEqual(['fill_water','pack_water']);
    const target=mount({noStorage:true,noScene:true});await openBackup(target,source);
    expect(target.$('#planSteps').children).toHaveLength(2);
    target.$('#nextPlanButton').click();target.act('fill_water');
    expect(target.$('#planSteps li').textContent).toContain('Done at step 1');
  },15000);
  it('preserves an unreadable plan and keeps practice available',()=>{
    const h=mount(),key='alloflow-life-outing-plan:v1:'+h.run().runId;
    const restored=mount({saved:[...h.save(),[key,'{broken']]});
    expect(restored.w.localStorage.getItem(key)).toBe('{broken');
    expect(restored.$('#backupStatus').textContent).toContain('saved plan could not be read');
    restored.act('fill_water');
    expect(restored.$('#clock').textContent).toBe('09:01');
  },15000);
  it('does not replace a newly edited plan when a backup finishes reading',()=>{
    const h=mount();let reader;h.w.FileReader=class{constructor(){reader=this;}readAsText(){}};
    Object.defineProperty(h.$('#restoreFile'),'files',{value:[{size:10}]});h.$('#restoreFile').dispatchEvent(new h.w.Event('change'));
    addPlan(h,'wear_ready');reader.result=JSON.stringify(h.E.createBackup(h.E.createRun(),''));reader.onload();
    expect(h.$('#planSteps').textContent).toContain('clean, dry outfit');
    expect(h.$('#backupStatus').textContent).toContain('changed while');
  });
  it('revisits any decision, compares completed outcomes and keeps the original on reload', () => {
    const h=mount(); complete(h); const original=h.run();
    h.$('#reviewButton').click();
    expect(h.$('#choiceHistory').open).toBe(true);
    expect(h.w.document.activeElement.id).toBe('reviewChoice');
    expect(h.$('#reviewChoice').value).toBe('6');
    h.$('#reflection').value='Check accessible travel.';h.$('#reflection').dispatchEvent(new h.w.Event('input'));
    chooseReview(h,1);
    expect(h.$('#reviewConsequence').textContent).toContain('This took 2 minutes.');
    h.$('#retryChoiceButton').click();
    expect(h.run().commands).toHaveLength(0);
    expect(h.$('#stationTitle').textContent).toBe('Wardrobe');
    expect(h.w.document.activeElement.id).toBe('stationActions');
    expect(h.$('#comparisonCard').hidden).toBe(false);
    expect(h.$('#reflection').value).toBe('');
    expect(h.$('#outcomeComparison').hidden).toBe(true);
    h.act('prepare_clothes'); h.station('Kitchen'); h.act('fill_water'); h.act('pack_water');
    h.station('Doorway'); h.act('pack_document'); h.act('pack_raincoat');
    h.station('Travel');h.act('choose_ride');h.act('depart');
    expect(h.$('#revisedChoice').textContent).toContain('This took 8 minutes.');
    expect(h.$('#comparisonRows').textContent).toContain('09:3009:27');
    expect(h.$('#outcomeComparison').hidden).toBe(false);
    expect(h.w.document.activeElement.id).toBe('comparisonTitle');
    expect(h.E.readRun(h.w.localStorage,h.E.saveKey(original))).toEqual(original);
    const restored=mount({saved:h.save()});
    expect(restored.$('#comparisonRows').textContent).toBe(h.$('#comparisonRows').textContent);
    restored.$('#savedRuns').value=h.E.saveKey(original);restored.$('#resumeButton').click();
    expect(restored.$('#reflection').value).toBe('Check accessible travel.');
  },15000);
  it('downloads the current reflection and comparison even before the field loses focus', async () => {
    const h=mount(); complete(h);chooseReview(h,6);h.$('#retryChoiceButton').click();
    h.$('#reflection').value='A note still being typed.';
    let blob;h.w.URL.createObjectURL=value=>{blob=value;return 'blob:test';};h.w.URL.revokeObjectURL=()=>{};
    h.w.HTMLAnchorElement.prototype.click=()=>{};h.$('#downloadButton').click();
    const source=await new Promise(resolve=>{const reader=new h.w.FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});
    const backup=h.E.readBackup(source);
    expect(backup.reflection).toBe('A note still being typed.');
    expect(backup.comparison.revision).toBe(5);
    expect(backup.run.commands).toHaveLength(5);
  });
  it('opens valid backups as new copies with inert reflections and never overwrites an existing save', async () => {
    const h=mount();complete(h);const original=h.run(),key=h.E.saveKey(original);
    const backup=h.E.createBackup(original,'<img src=x onerror=alert(1)>');
    await openBackup(h,JSON.stringify(backup));
    expect(h.run().runId).not.toBe(original.runId);
    expect(h.E.materialize(h.run())).toEqual(h.E.materialize(original));
    expect(h.$('#reflection').value).toBe(backup.reflection);
    expect(h.$('#debrief img')).toBeNull();
    expect(h.E.readRun(h.w.localStorage,key)).toEqual(original);
    expect(h.w.document.activeElement.id).toBe('debriefTitle');
    const before=h.save();await openBackup(h,'{"version":99}');
    expect(h.save()).toEqual(before);
    expect(h.$('#backupStatus').textContent).toContain('unchanged');
  });
  it('restores the original comparison snapshot alongside the new practice', async () => {
    const h=mount();complete(h);const original=h.run();
    const revised=h.E.dispatch(h.E.dispatch(h.E.branchRun(original,5),'choose_ride'),'depart');
    const backup=h.E.createBackup(revised,'Ask about transport.',{original,revision:5});
    await openBackup(h,JSON.stringify(backup));
    expect(h.$('#comparisonRows').textContent).toContain('09:3009:21');
    expect(h.$('#reflection').value).toBe('Ask about transport.');
    expect(h.w.document.activeElement.id).toBe('comparisonTitle');
    const restored=mount({saved:h.save()});
    expect(restored.$('#comparisonRows').textContent).toBe(h.$('#comparisonRows').textContent);
    expect(h.E.readRun(h.w.localStorage,h.E.saveKey(original))).toEqual(original);
  });
  it('ignores a backup that finishes opening after a learner makes another choice', () => {
    const h=mount();let reader;
    h.w.FileReader=class {constructor(){reader=this;}readAsText(){}};
    Object.defineProperty(h.$('#restoreFile'),'files',{value:[{size:10}]});
    h.$('#restoreFile').dispatchEvent(new h.w.Event('change'));
    h.act('fill_water');const before=h.run();
    reader.result=JSON.stringify(h.E.createBackup(h.E.createRun(),''));reader.onload();
    expect(h.run()).toEqual(before);
    expect(h.$('#backupStatus').textContent).toContain('changed while');
  });
  it('retries and opens a backup with storage blocked and without 3D', async () => {
    const h=mount({noStorage:true,noScene:true});h.act('fill_water');
    h.$('#retryChoiceButton').click();
    expect(h.$('#clock').textContent).toBe('09:00');
    expect(h.$('#comparisonCard').hidden).toBe(false);
    const run=h.E.dispatch(h.E.createRun(),'wear_ready');
    await openBackup(h,JSON.stringify(run));
    expect(h.$('#clock').textContent).toBe('09:02');
    expect(h.$('#saveStatus').textContent).toContain('unavailable');
    expect(h.$('#downloadButton').hidden).toBe(false);
  });
  it('inspects the same object through 3D and keyboard controls without changing the journal', () => {
    const scene = mount(), controls = mount();
    scene.$('#bottleObject').dispatchEvent(new scene.w.MouseEvent('click', {bubbles:true}));
    controls.$('[data-inspect="bottle"]').click();
    expect(scene.$('#objectTitle').textContent).toBe('Water bottle');
    expect(scene.$('#objectStatus').textContent).toBe(controls.$('#objectStatus').textContent);
    expect(scene.run().commands).toHaveLength(0);
    expect(controls.run().commands).toHaveLength(0);
    scene.act('fill_water', 'scene'); controls.act('fill_water');
    expect(scene.E.materialize(scene.run())).toEqual(controls.E.materialize(controls.run()));
    expect(scene.$('#objectStatus').textContent).toContain('Filled');
  }, 15000); // Two complete standalone DOMs can initialize slowly on Windows.
  it('lets learners inspect a packed item and read the actual recent consequences', () => {
    const h = mount(); h.act('fill_water'); h.act('pack_water');
    h.$('#inventory button').click();
    expect(h.$('#objectTitle').textContent).toBe('Water bottle');
    expect(h.$('#objectStatus').textContent).toBe('Filled and packed');
    expect(h.run().commands).toHaveLength(2);
    expect(h.$('#recentChoices').textContent).toContain('The filled bottle is in your bag.');
    h.$('#focusView').click();
    expect(h.$('#focusView').getAttribute('aria-pressed')).toBe('true');
    expect(h.run().commands).toHaveLength(2);
  });
  it('shows an updated arrival and allows a ride after the selected bus is delayed', () => {
    const h = mount(); h.$('#scenarioSelect').value = 'bus-delay';
    h.$('#settingsForm').dispatchEvent(new h.w.Event('submit', {bubbles:true,cancelable:true}));
    h.$('#travelPreview').click(); h.act('choose_bus');
    expect(h.$('#travelPreview').textContent).toContain('09:30');
    h.station('Kitchen'); h.act('fill_water'); h.act('pack_water');
    h.station('Wardrobe'); h.act('wear_ready');
    expect(h.$('#travelPreview').textContent).toContain('09:45');
    expect(h.$('#travelPreview').classList.contains('route-late')).toBe(true);
    expect(h.$('#eventCard').closest('.world-card')).not.toBeNull();
    h.$('#travelPreview').click(); h.act('choose_ride');
    expect(h.$('#travelPreview').textContent).toContain('Arranged ride');
    expect(h.$('#travelPreview').classList.contains('route-late')).toBe(false);
  });
  it('resumes an older ruleset and starts a separate practice for the new situation', () => {
    const first = mount(), legacy = first.run(); legacy.manifestVersion = 1;
    const key = first.E.saveKey(legacy);
    const h = mount({saved:[[key,JSON.stringify(legacy)],[activeKey,key]]});
    expect(h.run().manifestVersion).toBe(1);
    h.station('Travel'); expect(h.$('#actionList [data-action="choose_ride"]')).toBeNull();
    h.$('#scenarioSelect').value = 'bus-delay';
    h.$('#settingsForm').dispatchEvent(new h.w.Event('submit', {bubbles:true,cancelable:true}));
    expect(h.run().manifestVersion).toBe(2);
    expect(h.run().runId).not.toBe(legacy.runId);
    expect(JSON.parse(h.w.localStorage.getItem(key))).toEqual(legacy);
  });
  it('reaches the same result through the real structured and scene action handlers', () => {
    const buttons = mount(), scene = mount(); complete(buttons); complete(scene, 'scene');
    expect(buttons.E.materialize(buttons.run())).toEqual(scene.E.materialize(scene.run()));
    expect(buttons.$('#debrief').hidden).toBe(false);
    expect(buttons.$('#progressCount').textContent).toBe('6 / 6 ready');
    expect(buttons.w.document.activeElement.id).toBe('debriefTitle');
    expect(scene.$('#bagObject').getAttribute('visible')).toBe('false');
    expect(scene.$('#packedDocument').getAttribute('visible')).toBe('false');
  }, 15000);

  it('keeps keyboard focus on a useful action after the action list changes', () => {
    const h = mount(); h.act('fill_water');
    expect(h.w.document.activeElement.dataset.action).toBe('pack_water');
    h.act('pack_water');
    expect(h.w.document.activeElement.id).toBe('stationActions');
    h.$('#sceneToggle').click();
    expect(h.$('#sceneContainer').hidden).toBe(true);
    expect(h.run().commands).toHaveLength(2);
  });

  it('restores the exact journal and accepted prose after reload', async () => {
    const h = mount(); h.act('fill_water'); h.$('#introButton').click(); await flush();
    const restored = mount({ saved: h.save() });
    expect(restored.run()).toEqual(h.run());
    expect(restored.$('#storyText').textContent).toBe(h.$('#storyText').textContent);
    expect(restored.$('#clock').textContent).toBe('09:01');
  });

  it('updates the debrief when a story is saved after completion', async () => {
    const h = mount(); complete(h); h.$('#introButton').click(); await flush();
    expect(h.$('#debriefSummary').textContent).toContain('Optional story moments saved: 1.');
    expect(h.run().commands).toHaveLength(7);
  });

  it('replays a different forecast under a new save and can resume the original', () => {
    const h = mount(); complete(h); const original = h.run(), key = h.E.saveKey(original);
    h.$('#replayButton').click();
    expect(h.run().runId).not.toBe(original.runId);
    expect(h.run().config.variation).toBe('warm');
    expect(h.run().commands).toHaveLength(0);
    expect(JSON.parse(h.w.localStorage.getItem(key))).toEqual(original);
    h.$('#savedRuns').value = key; h.$('#resumeButton').click();
    expect(h.run()).toEqual(original);
  });

  it('keeps context, language and coaching independent and leaves access changes out of the journal', () => {
    const h = mount(); h.$('#contextSelect').value = 'work'; h.$('#supportSelect').value = 'independent'; h.$('#languageSelect').value = 'plain';
    h.$('#settingsForm').dispatchEvent(new h.w.Event('submit', { bubbles: true, cancelable: true }));
    expect(h.run().config).toMatchObject({ context: 'work', language: 'plain', support: 'independent' });
    expect(h.$('#hintContent').hidden).toBe(true);
    h.$('#sceneToggle').click(); expect(h.run().commands).toHaveLength(0);
    h.$('#hintButton').click(); expect(h.$('#hintContent').hidden).toBe(false);
    expect(h.run().commands[0].actionId).toBe('hint');
  });

  it('discards stale generated prose and stores current prose without changing the world', async () => {
    const calls = []; const h = mount({ provider: (payload, options) => new Promise(resolve => calls.push({ payload, options, resolve })) });
    h.$('#introButton').click(); h.act('fill_water');
    expect(calls[0].options.signal.aborted).toBe(true);
    calls[0].resolve({ text: 'An obsolete introduction.', status: 'generated' }); await flush();
    expect(h.run().content).toHaveLength(0);
    h.$('[data-intent="plan"]').click(); const before = h.E.materialize(h.run());
    calls[1].resolve({ text: 'Sam is looking forward to the outing.', status: 'generated' }); await flush();
    expect(h.run().content).toHaveLength(1);
    expect(h.E.materialize(h.run())).toEqual(before);
    expect(h.$('#storyLabel').textContent).toContain('Generated story');
  });

  it('allows practice with blocked storage or unavailable 3D and preserves corrupt saves', () => {
    const offline = mount({ noScene: true, noStorage: true }); offline.act('fill_water');
    expect(offline.$('#clock').textContent).toBe('09:01');
    expect(offline.$('#sceneUnavailable').hidden).toBe(false);
    expect(offline.$('#downloadButton').hidden).toBe(false);
    const key = 'alloflow-life-outing:v1:broken';
    const recovered = mount({ saved: [[key, '{broken']] });
    expect(recovered.w.localStorage.getItem(key)).toBe('{broken');
    expect(recovered.$('#savedRuns').textContent).toContain('Unreadable saved practice');
  });
});
