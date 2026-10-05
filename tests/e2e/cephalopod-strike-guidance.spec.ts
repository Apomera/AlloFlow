import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const errors = new WeakMap<Page, string[]>(), canvas = 'canvas[role=application]';
async function step(page: Page, count: number) {
  await page.evaluate(async count => { const w = window as any; for (let i = 0; i < count; i++) { w.__guidanceStep = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__guidanceStep !== 0); } }, count);
}
async function mount(page: Page, phone: boolean) {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'humboldtSquid', huntMode: 'free', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  if (phone) await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); });
  await page.evaluate(async () => {
    const w = window as any; w.__guidanceScene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__guidancePlayer = w.__guidanceScene.getObjectByName('cl-player');
    const fish = w.__guidanceScene.children.filter((o: any) => o.userData.alive && o.userData.offset);
    if (!fish.length) throw new Error('Actual seeded fish required'); w.__guidanceFish = fish[0];
    w.__guidanceStep = 0; w.__guidanceTicks = 0; w.THREE.Clock.prototype.getDelta = function () { const dt = w.__guidanceStep; w.__guidanceStep = 0; if (dt) w.__guidanceTicks++; return dt; };
    // Read the real school during one frozen production frame; restore the hook immediately.
    const each = Array.prototype.forEach; let center: any;
    (Array.prototype as any).forEach = function (callback: any, thisArg: any) {
      if (this.length && this[0]?.center?.isVector3 && Array.isArray(this[0]?.fish) && typeof this[0]?.heading === 'number') each.call(this, (school: any) => { if (school?.center?.isVector3 && Array.isArray(school.fish) && school.fish.includes(fish[0])) center = school.center; });
      return each.call(this, callback, thisArg);
    };
    try { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } finally { Array.prototype.forEach = each; }
    if (!center) throw new Error('Actual fish-school center required'); w.__guidanceCenter = center; fish[0].userData.offset.set(0, 0, 0);
    // Park living competitors beyond acquisition range without replacing AI or selection.
    fish.slice(1).forEach((o: any) => o.position.set(w.__guidancePlayer.position.x + 80, 4, w.__guidancePlayer.position.z));
    w.__guidanceScene.children.forEach((o: any) => {
      if (o.userData.alive && o.userData.cfg) { o.position.set(w.__guidancePlayer.position.x + 80, .18, w.__guidancePlayer.position.z); o.userData.speed = 0; }
      if (o.userData.substrate === 'rock') { o.position.set(-45, o.position.y, -45); o.userData.substrateRadius = 0; }
      if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9;
    });
    // Observe the real target-halo copy. updateTargets runs before the live fish AI.
    // Its last copied coordinates identify the target without mistaking one fish step for retargeting.
    const halo = w.__guidanceScene.getObjectByName('cl-target'), copy = halo.position.copy;
    w.__guidanceHaloCopy = null; w.__guidanceHaloCopies = 0;
    halo.position.copy = function (position: any) {
      const result = copy.call(this, position);
      w.__guidanceHaloCopy = { sourceIsFish: position === w.__guidanceFish.position, source: position.toArray(), fishUUID: w.__guidanceFish.uuid, count: ++w.__guidanceHaloCopies };
      return result;
    };
    w.__guidanceContactArmed = false; w.__guidanceFirstContact = null; w.__guidanceContactTick = null;
    // Observe the real announcement scheduling and first subsequent native scene render.
    // Delegate unchanged; the production 30ms live-region delay and all clocks remain intact.
    const schedule = window.setTimeout;
    (window as any).setTimeout = function (callback: any, delay: any, ...args: any[]) {
      if (w.__guidanceContactArmed && delay === 30 && typeof callback === 'function' && callback.toString().includes('lr.textContent = msg')) w.__guidanceContactTick = w.__guidanceTicks;
      return schedule.call(window, callback, delay, ...args);
    };
    w.__guidanceDraws = 0; const previous = w.__guidanceScene.onAfterRender;
    w.__guidanceScene.onAfterRender = function () {
      if (previous) previous.apply(this, arguments); w.__guidanceDraws++;
      if (w.__guidanceContactArmed && w.__guidanceContactTick !== null) {
        const readout = document.querySelector('.cl-target-readout') as HTMLElement;
        w.__guidanceFirstContact = { ticks: w.__guidanceTicks, contactTick: w.__guidanceContactTick, message: document.querySelector('.cl-mission-brief')!.textContent, readoutHidden: readout.hidden, state: readout.dataset.state, targetText: document.querySelector('[data-target=action]')!.textContent };
        w.__guidanceContactArmed = false;
      }
    };
    w.__guidanceScene.updateMatrixWorld(true);
  });
}
async function positionFish(page: Page, delta: number, horizontal: number) {
  await page.evaluate(({ delta, horizontal }) => { const w = window as any; w.__guidanceCenter.copy(w.__guidancePlayer.position).add(new w.THREE.Vector3(0, delta, horizontal)); w.__guidanceFish.position.copy(w.__guidanceCenter); w.__guidanceScene.updateMatrixWorld(true); }, { delta, horizontal });
}
async function input(page: Page, phone: boolean, action: 'Target' | 'Strike') {
  if (!phone) { await page.locator(canvas).focus(); await page.keyboard.press(action === 'Target' ? 'KeyT' : 'KeyE'); return; }
  const button = page.getByRole('button', { name: action === 'Target' ? 'Target' : 'Strike / hold', exact: true });
  // Locator tap scrolls the actual button into view before dispatching native touch input.
  await expect(button).toBeVisible(); await button.tap();
}
async function armContact(page: Page) {
  await page.evaluate(() => { const w = window as any; w.__guidanceContactArmed = true; w.__guidanceFirstContact = null; w.__guidanceContactTick = null; });
}
function expectContactFrame(frame: any, advice: string, lost = false) {
  expect(frame, 'A real contact announcement must be observed at its first native render').not.toBeNull();
  expect(frame.ticks).toBe(frame.contactTick); expect(frame.message).toContain(advice);
  if (lost) expect(frame.readoutHidden).toBe(true);
  else { expect(frame.readoutHidden).toBe(false); expect(frame.state).toBe('recovering'); expect(frame.targetText).toMatch(/^RECOVERING/); }
}
async function snapshot(page: Page) {
  return page.evaluate(() => { const w = window as any, fish = w.__guidanceFish, p = w.__guidancePlayer.position;
    return { uuid: fish.uuid, alive: fish.userData.alive, deltaY: fish.position.y - p.y, horizontal: Math.hypot(fish.position.x - p.x, fish.position.z - p.z), distance: fish.position.distanceTo(p), score: Number(document.querySelector('[data-hud=score]')!.textContent), ticks: w.__guidanceTicks, draws: w.__guidanceDraws, player: p.toArray(), message: document.querySelector('.cl-mission-brief')!.textContent, spoken: document.getElementById('allo-live-cl')!.textContent, firstContact: w.__guidanceFirstContact };
  });
}

test.describe.configure({ timeout: 480000, retries: 0, mode: 'default' }); test.use({ trace: 'off', video: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => { const failures: string[] = []; errors.set(page, failures); page.on('pageerror', error => failures.push(error.message)); page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); }); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

for (const phone of [false, true]) test.describe(phone ? 'phone contact guidance' : 'desktop contact guidance', () => {
  test.use({ hasTouch: phone, viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 1100 } });
  test('a real committed fish receives signed depth, range, and lost-target advice at contact', async ({ page }, testInfo) => {
    await mount(page, phone); const evidence: any[] = [];
    for (const fixture of [{ delta: 3.5, horizontal: 1, advice: 'Missed. Rise to match the target depth.' }, { delta: -3.5, horizontal: 1, advice: 'Missed. Dive to match the target depth.' }, { delta: 0, horizontal: 6, advice: 'Missed. Move closer to the target.' }]) {
      await positionFish(page, 0, .65); await step(page, 2); await input(page, phone, 'Target'); await step(page, 2);
      const ownership = await page.evaluate(() => {
        const w = window as any, halo = w.__guidanceScene.getObjectByName('cl-target'), witness = w.__guidanceHaloCopy;
        if (!witness) throw new Error('The production halo must copy an actual target position');
        return { visible: halo.visible, witness, fishUUID: w.__guidanceFish.uuid, copiedPositionError: halo.position.distanceTo(new w.THREE.Vector3(...witness.source).add(new w.THREE.Vector3(0, .06, 0))), currentFishDistance: halo.position.distanceTo(w.__guidanceFish.position.clone().add(new w.THREE.Vector3(0, .06, 0))) };
      });
      expect(ownership.visible).toBe(true); expect(ownership.witness.sourceIsFish).toBe(true); expect(ownership.witness.fishUUID).toBe(ownership.fishUUID); expect(ownership.witness.count).toBeGreaterThan(0);
      expect(ownership.copiedPositionError).toBeLessThan(1e-6);
      // The original AI caps travel at (2.6 + alarm * 2) * .05 <= .23m per frame.
      // This conservative .9m proximity bound accompanies exact identity and copied-position assertions.
      expect(ownership.currentFishDistance).toBeLessThan(.9);
      await armContact(page); await input(page, phone, 'Strike'); await step(page, 1); const committed = await snapshot(page); expect(committed.alive).toBe(true);
      // Move the original living prey after commitment; the original school and capture predicate remain live.
      // The input request can commit during a zero-delta render while keyboard/touch awaits.
      // First step + these two steps is 150ms from that earliest commitment, before 200ms contact.
      await positionFish(page, fixture.delta, fixture.horizontal); await step(page, 2); const windup = await snapshot(page);
      expect(windup.alive).toBe(true); expect(windup.message).not.toContain(fixture.advice); expect(windup.ticks - committed.ticks).toBe(2);
      await step(page, 3); await expect(page.locator('.cl-mission-brief')).toBeVisible(); await expect(page.locator('.cl-mission-brief')).toContainText(fixture.advice); await expect(page.locator('#allo-live-cl')).toHaveText(fixture.advice);
      const contact = await snapshot(page); expectContactFrame(contact.firstContact, fixture.advice); expect(contact.uuid).toBe(committed.uuid); expect(contact.alive).toBe(true); expect(contact.score).toBe(0); expect(contact.draws).toBeGreaterThan(0);
      if (fixture.delta > 0) expect(contact.deltaY).toBeGreaterThan(2.2); else if (fixture.delta < 0) expect(contact.deltaY).toBeLessThan(-2.2); else { expect(Math.abs(contact.deltaY)).toBeLessThan(2.2); expect(contact.distance).toBeGreaterThan(2.2); await expect(page.locator('.cl-mission-brief')).not.toContainText('match the target depth'); }
      evidence.push({ fixture, ownership, committed, windup, contact }); await step(page, 15);
    }
    await positionFish(page, 0, .65); await step(page, 2); await input(page, phone, 'Target'); await step(page, 2); await armContact(page); await input(page, phone, 'Strike'); await step(page, 1); const committed = await snapshot(page);
    await page.evaluate(() => { (window as any).__guidanceFish.userData.alive = false; }); await step(page, 2); const windup = await snapshot(page);
    const lostAdvice = phone ? 'Target lost. Tap Target to select nearby prey.' : 'Target lost. T selects another nearby prey.';
    expect(windup.message).not.toContain(lostAdvice); await step(page, 3); await expect(page.locator('.cl-mission-brief')).toBeVisible(); await expect(page.locator('.cl-mission-brief')).toContainText(lostAdvice); await expect(page.locator('#allo-live-cl')).toHaveText(lostAdvice);
    const lost = await snapshot(page); expectContactFrame(lost.firstContact, lostAdvice, true); expect(lost.uuid).toBe(committed.uuid); expect(lost.alive).toBe(false); expect(lost.score).toBe(0); await expect(page.locator('.cl-mission-brief')).not.toContainText('Move closer'); evidence.push({ committed, windup, lost, lostAdvice });
    await testInfo.attach('contact-guidance-ownership-visible-spoken', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
    await testInfo.attach('contact-guidance-view', { body: await page.locator('.cl-hunt-stage').screenshot(), contentType: 'image/png' });
    await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  });
});
