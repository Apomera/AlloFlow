# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-prey-memory.spec.ts >> target feedback follows wary, fleeing and settling prey, with memory frozen during inspection and cleared when calm
- Location: tests\e2e\cephalopod-prey-memory.spec.ts:154:5

# Error details

```
Test timeout of 150000ms exceeded.
```

```
Test timeout of 240000ms exceeded while running "afterEach" hook.
```

# Test source

```ts
  8   | async function advance(page: Page, frames: number) {
  9   |   await page.evaluate(async count => {
  10  |     const w = window as any;
  11  |     for (let frame = 0; frame < count; frame++) {
  12  |       w.__testStep = .05;
  13  |       do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
  14  |       while (w.__testStep !== 0);
  15  |     }
  16  |   }, frames);
  17  | }
  18  | 
  19  | async function mount(page: Page) {
  20  |   await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'humboldtSquid', huntMode: 'observe', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  21  |   await page.evaluate(async () => {
  22  |     const w = window as any;
  23  |     w.__scene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
  24  |     w.__player = w.__scene.getObjectByName('cl-player');
  25  |     w.__testStep = 0;
  26  |     w.THREE.Clock.prototype.getDelta = function () { const dt = w.__testStep; w.__testStep = 0; return dt; };
  27  |     // Capture the existing school object during a frozen frame. Keep its real
  28  |     // fish, update loop and visibility checks; restore the hook immediately.
  29  |     const each = Array.prototype.forEach;
  30  |     (Array.prototype as any).forEach = function (callback: any, thisArg: any) {
  31  |       if (this.length && this[0]?.center?.isVector3 && Array.isArray(this[0]?.fish) && typeof this[0]?.heading === 'number') w.__school = this[0];
  32  |       return each.call(this, callback, thisArg);
  33  |     };
  34  |     try { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
  35  |     finally { Array.prototype.forEach = each; }
  36  |     if (!w.__school || w.__school.fish.length !== 8) throw new Error('Could not capture the actual eight-fish school');
  37  |     w.__player.position.x = 0; w.__player.position.z = 0;
  38  |     w.__school.center.copy(w.__player.position).add(new w.THREE.Vector3(0, 0, 3));
  39  |     w.__school.heading = 0; w.__school.wanderTimer = 1000; w.__school.alarm = 0; w.__school.lastThreatPosition = null;
  40  |     w.__scene.children.forEach((object: any) => {
  41  |       if (object.name === 'cl-prey-fish' && !w.__school.fish.includes(object)) object.userData.alive = false;
  42  |       if (object.userData.alive && object.userData.cfg) { object.position.set(-30, .18, -30); object.userData.speed = 0; }
  43  |       if (object.userData.substrate === 'rock') { object.position.set(-30, object.position.y, -30); object.userData.substrateRadius = 0; }
  44  |       if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9;
  45  |     });
  46  |     w.__school.fish.forEach((fish: any, index: number) => {
  47  |       Object.assign(fish.userData, { alive: true, alert: false, awareness: 0, threatVisible: false, intent: 'unaware', distracted: false });
  48  |       fish.userData.offset.set((index % 4 - 1.5) * .08, 0, Math.floor(index / 4) * .08);
  49  |       fish.position.copy(w.__school.center).add(fish.userData.offset);
  50  |     });
  51  |     w.__cover = w.__scene.children.find((object: any) => object.userData.substrate === 'rock');
  52  |     w.__cover.geometry.dispose(); w.__cover.geometry = new w.THREE.BoxGeometry(40, 12, .2);
  53  |     w.__cover.rotation.set(0, 0, 0); w.__cover.scale.setScalar(1);
  54  |     w.__scene.updateMatrixWorld(true);
  55  |   });
  56  |   await page.locator(canvas).focus();
  57  |   await page.keyboard.press('KeyT');
  58  | }
  59  | 
  60  | async function cover(page: Page, enabled: boolean) {
  61  |   await page.evaluate(enabled => {
  62  |     const w = window as any;
  63  |     w.__cover.position.set(enabled ? 0 : -30, 4, enabled ? 1.5 : -30);
  64  |     w.__scene.updateMatrixWorld(true);
  65  |   }, enabled);
  66  | }
  67  | 
  68  | async function schoolState(page: Page) {
  69  |   return page.evaluate(() => {
  70  |     const school = (window as any).__school;
  71  |     return {
  72  |       center: school.center.toArray(), heading: school.heading, alarm: school.alarm,
  73  |       memory: school.lastThreatPosition ? { ...school.lastThreatPosition } : null,
  74  |       fish: school.fish.map((fish: any) => ({ position: fish.position.toArray(), rotation: fish.rotation.toArray(), phase: fish.userData.swimPhase, awareness: fish.userData.awareness, visible: fish.userData.threatVisible, alert: fish.userData.alert, intent: fish.userData.intent })),
  75  |     };
  76  |   });
  77  | }
  78  | 
  79  | async function expectCoverIsOnlySightBarrier(page: Page, blocked: boolean) {
  80  |   const rays = await page.evaluate(() => {
  81  |     const w = window as any;
  82  |     w.__scene.updateMatrixWorld(true);
  83  |     return w.__school.fish.map((fish: any) => {
  84  |       const direction = w.__player.position.clone().sub(fish.position);
  85  |       const distance = direction.length();
  86  |       const ray = new w.THREE.Raycaster(fish.position, direction.normalize(), 0, distance);
  87  |       return { distance, depth: Math.abs(fish.position.y - w.__player.position.y), blocked: ray.intersectObject(w.__cover, false).length > 0 };
  88  |     });
  89  |   });
  90  |   expect(rays).toHaveLength(8);
  91  |   for (const ray of rays) {
  92  |     // Keep every fish within its normal visual range and depth band, so a
  93  |     // hidden result can only come from the actual intervening rock geometry.
  94  |     expect(ray.distance).toBeLessThan(5);
  95  |     expect(ray.depth).toBeLessThan(2.8);
  96  |     expect(ray.blocked).toBe(blocked);
  97  |   }
  98  | }
  99  | 
  100 | test.describe.configure({ timeout: 150000, retries: 0 });
  101 | test.beforeAll(() => harness.start());
  102 | test.afterAll(() => harness.stop());
  103 | test.beforeEach(({ page }) => {
  104 |   const events: string[] = []; errors.set(page, events);
  105 |   page.on('pageerror', error => events.push(error.message));
  106 |   page.on('console', message => { if (message.type() === 'error') events.push(message.text()); });
  107 | });
> 108 | test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });
      |      ^ Test timeout of 240000ms exceeded while running "afterEach" hook.
  109 | 
  110 | test('concealed player movement cannot redirect an alarmed school, while renewed sight refreshes its escape', async ({ page }) => {
  111 |   await mount(page);
  112 |   await advance(page, 8);
  113 |   const acquired = await schoolState(page);
  114 |   expect(acquired.alarm).toBeGreaterThan(.3);
  115 |   expect(acquired.memory).not.toBeNull();
  116 |   expect(acquired.fish.every((fish: any) => fish.visible && fish.alert)).toBe(true);
  117 |   await cover(page, true);
  118 |   await page.evaluate(() => {
  119 |     const w = window as any, school = w.__school;
  120 |     w.__pairedSchool = { center: school.center.clone(), heading: school.heading, alarm: school.alarm, intent: school.intent, wanderTimer: school.wanderTimer, memory: { ...school.lastThreatPosition }, fish: school.fish.map((fish: any) => ({ position: fish.position.clone(), rotation: fish.rotation.clone(), phase: fish.userData.swimPhase, awareness: fish.userData.awareness, visible: fish.userData.threatVisible, alert: fish.userData.alert, intent: fish.userData.intent })) };
  121 |   });
  122 |   async function concealedBranch(playerX: number) {
  123 |     await page.evaluate(playerX => {
  124 |       const w = window as any, school = w.__school, before = w.__pairedSchool;
  125 |       school.center.copy(before.center); school.heading = before.heading; school.alarm = before.alarm; school.intent = before.intent; school.wanderTimer = before.wanderTimer; school.lastThreatPosition = { ...before.memory };
  126 |       school.fish.forEach((fish: any, index: number) => { const prior = before.fish[index]; fish.position.copy(prior.position); fish.rotation.copy(prior.rotation); Object.assign(fish.userData, { swimPhase: prior.phase, awareness: prior.awareness, threatVisible: prior.visible, alert: prior.alert, intent: prior.intent }); });
  127 |       w.__player.position.x = playerX; w.__player.position.z = 0;
  128 |       w.__scene.updateMatrixWorld(true);
  129 |     }, playerX);
  130 |     await expectCoverIsOnlySightBarrier(page, true);
  131 |     await advance(page, 1);
  132 |     return schoolState(page);
  133 |   }
  134 |   const left = await concealedBranch(-2), right = await concealedBranch(2);
  135 |   for (const result of [left, right]) {
  136 |     expect(result.fish.every((fish: any) => !fish.visible && fish.intent === 'settling')).toBe(true);
  137 |     expect(result.memory).toEqual(acquired.memory);
  138 |     expect(result.alarm).toBeLessThan(acquired.alarm);
  139 |   }
  140 |   // These are the same real school restored to the same state, then advanced
  141 |   // by one equal simulation tick; only the concealed player's position differs.
  142 |   expect(left.heading).toBeCloseTo(right.heading, 10);
  143 |   left.center.forEach((value: number, axis: number) => expect(value).toBeCloseTo(right.center[axis], 10));
  144 |   left.fish.forEach((fish: any, index: number) => fish.position.forEach((value: number, axis: number) => expect(value).toBeCloseTo(right.fish[index].position[axis], 10)));
  145 |   await cover(page, false);
  146 |   await expectCoverIsOnlySightBarrier(page, false);
  147 |   await advance(page, 1);
  148 |   const seenAgain = await schoolState(page);
  149 |   expect(seenAgain.fish.every((fish: any) => fish.visible && fish.intent === 'fleeing')).toBe(true);
  150 |   expect(seenAgain.memory).toEqual({ x: 2, z: 0 });
  151 |   expect(Math.abs(seenAgain.heading - right.heading)).toBeGreaterThan(.02);
  152 | });
  153 | 
  154 | test('target feedback follows wary, fleeing and settling prey, with memory frozen during inspection and cleared when calm', async ({ page }) => {
  155 |   await mount(page);
  156 |   await advance(page, 3);
  157 |   const wary = await schoolState(page);
  158 |   expect(wary.alarm).toBeGreaterThan(0); expect(wary.alarm).toBeLessThanOrEqual(.3);
  159 |   expect(wary.fish.every((fish: any) => fish.visible && !fish.alert && fish.intent === 'wary' && fish.awareness === wary.alarm)).toBe(true);
  160 |   // Target selection reads the prior AI frame and the HUD is throttled. A
  161 |   // frozen render then normal pause refreshes it without extending wary time.
  162 |   await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  163 |   await page.keyboard.press('Escape');
  164 |   await expect(page.locator('[data-target=action]')).toContainText('prey is wary');
  165 |   expect((await schoolState(page)).alarm).toBe(wary.alarm);
  166 |   await page.keyboard.press('Escape');
  167 |   await advance(page, 5);
  168 |   const fleeing = await schoolState(page);
  169 |   expect(fleeing.fish.every((fish: any) => fish.visible && fish.alert && fish.intent === 'fleeing')).toBe(true);
  170 |   await expect(page.locator('[data-target=action]')).toContainText('prey is fleeing');
  171 |   await cover(page, true);
  172 |   await expectCoverIsOnlySightBarrier(page, true);
  173 |   await advance(page, 3);
  174 |   const settling = await schoolState(page);
  175 |   expect(settling.alarm).toBeGreaterThan(0); expect(settling.alarm).toBeLessThan(fleeing.alarm);
  176 |   expect(settling.fish.every((fish: any) => !fish.visible && fish.intent === 'settling' && fish.awareness === settling.alarm)).toBe(true);
  177 |   await expect(page.locator('[data-target=action]')).toContainText('prey is settling');
  178 |   await page.keyboard.press('KeyF');
  179 |   const frozen = await schoolState(page);
  180 |   await advance(page, 15);
  181 |   expect(await schoolState(page)).toEqual(frozen);
  182 |   await page.getByRole('button', { name: 'Return to dive', exact: true }).click();
  183 |   for (let frame = 0; frame < 45 && (await schoolState(page)).alarm > 0; frame++) await advance(page, 1);
  184 |   await advance(page, 3); // Let the existing 8 Hz HUD consume the final intent.
  185 |   const calm = await schoolState(page);
  186 |   expect(calm.alarm).toBe(0); expect(calm.memory).toBeNull();
  187 |   expect(calm.fish.every((fish: any) => !fish.visible && !fish.alert && fish.intent === 'unaware' && fish.awareness === 0)).toBe(true);
  188 |   await expect(page.locator('[data-target=action]')).toContainText('prey is unaware');
  189 | });
  190 | 
```