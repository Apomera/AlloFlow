import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = 'reports/ecosystem-clearance-control';
test.describe.configure({ timeout: 300_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page); expect(errors, 'actual paw, clearance and controlled-comparison workflows have no uncaught errors').toEqual([]);
});

async function base(page: Page, preset: string, prediction = '') {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white'; });
  await page.getByRole('button', { name: preset, exact: true }).click();
  if (prediction) await page.getByLabel('Your prediction (optional)', { exact: true }).fill(prediction);
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
}

async function mount(page: Page, preset = 'Habitat restoration') {
  await base(page, preset);
  const meadow = page.locator('[data-efw-meadow]');
  if (!(await meadow.isVisible())) await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  const initialized = await page.waitForFunction(() => {
    const region = document.querySelector('[data-efw-meadow]'), hit = (window as any).__glCanvas?.('[data-efw-meadow]');
    if (hit?.rec?.scene && hit.rec.draws > 0 && region?.querySelector('canvas')?.hasAttribute('data-representative-index')) return 'ready';
    return region?.textContent?.includes('3D is unavailable on this device.') ? 'unavailable' : false;
  }, undefined, { timeout: 60_000 });
  expect(await initialized.jsonValue(), 'the actual renderer initializes and draws').toBe('ready');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config, pair = api.compare(config);
    w.__clearanceControlFrames = { baseline: api.behaviorTimeline(config, pair.baseline), experiment: api.behaviorTimeline(config, pair.experiment) };
  });
  return { meadow, canvas: meadow.locator('canvas'), stage: meadow.locator('.efw-meadow-stage'), timeline: meadow.getByLabel('Meadow timeline', { exact: true }) };
}

async function choose(page: Page, id: string, sample: any) {
  const meadow = page.locator('[data-efw-meadow]');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption(sample.branch || 'baseline');
  await meadow.getByRole('button', { name: id === 'foxes' ? /Red foxes\s[\d.]/ : /Rabbits\s[\d.]/ }).click();
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill(String(sample.step));
  const representative = meadow.getByLabel('Representative animal', { exact: true });
  if (!(await representative.count())) await meadow.getByRole('button', { name: 'Inspect selected group', exact: true }).click();
  if (await representative.isEnabled()) await representative.selectOption(String(sample.index));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-representative-index', String(sample.index));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-step', String(sample.step));
}

async function pawRig(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animal = scene.children.find((a: any) => a.visible && a.userData.limbSkin?.name === `eco-${id}-limb-skin`), d = animal.userData;
    const canvas = document.querySelector('[data-efw-meadow] canvas')!, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = reduced ? 0 : Number(canvas.getAttribute('data-step')), index = Number(canvas.getAttribute('data-representative-index'));
    const pose = w.__clearanceControlFrames[canvas.getAttribute('data-branch')!][step][id][index], art = api.mammalArticulation(id, pose, reduced);
    function shown(part: any) { for (let node = part; node; node = node.parent) if (!node.visible) return false; return true; }
    const feet = (id === 'foxes' ? d.legs : d.paws).map((leg: any, slot: number) => {
      const sole = id === 'foxes' ? leg.userData.rig.paw.children.find((m: any) => m.isMesh) : leg.userData.paw;
      const geometry = sole.geometry, positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal'), raw = api.mammalPawSurface(id, leg.userData.hind), m = sole.matrixWorld.elements;
      let error = 0, invalidNormals = 0, minimumY = Infinity, hash = 2166136261;
      const words = new Uint32Array(positions.array.buffer, positions.array.byteOffset, positions.array.length);
      for (let k = 0; k < positions.count; k++) {
        for (let axis = 0; axis < 3; axis++) { const at = k * 3 + axis; error = Math.max(error, Math.abs(positions.array[at] - raw.positions[at])); hash = Math.imul(hash ^ words[at], 16777619); }
        minimumY = Math.min(minimumY, m[1] * positions.getX(k) + m[5] * positions.getY(k) + m[9] * positions.getZ(k) + m[13]);
        const length = Math.hypot(normals.getX(k), normals.getY(k), normals.getZ(k)); if (!Number.isFinite(length) || Math.abs(length - 1) > 1e-4) invalidNormals++;
      }
      const analyticLower = m[13] - Math.hypot(m[1], m[5], m[9]), ground = api.groundHeight(m[12], m[14]);
      const batch = scene.children.find((node: any) => node.isInstancedMesh && node.userData.parts?.includes(sole)), active = batch.userData.parts.filter(shown), instance = active.indexOf(sole), actual = new T.Matrix4(); batch.getMatrixAt(instance, actual);
      return { name: sole.name, hind: leg.userData.hind, side: leg.userData.side, geometry: geometry.uuid, hash: hash >>> 0, vertices: positions.count, triangles: geometry.index.count / 3, error, invalidNormals, upright: m[5], samplingGap: minimumY - analyticLower, analyticGap: analyticLower - ground, minimumGap: minimumY - ground, planted: reduced || pose.footPlants[slot].planted, scale: sole.scale.toArray(), local: sole.position.toArray(), material: sole.material.uuid, materialVertexColors: sole.material.vertexColors, children: sole.children.length, drawn: instance >= 0 && instance < batch.count, batchError: Math.max(...actual.elements.map((value: number, k: number) => Math.abs(value - m[k]))), world: m.slice() };
    });
    const variants: any = {}; let creases = 0;
    scene.traverse((node: any) => { if (node.name.includes('toe-crease')) creases++; if (node.isMesh && node.geometry?.userData.ecoPawSurface) { const p = node.geometry.userData.ecoPawSurface, key = p.species + ':' + p.hind; (variants[key] ||= new Set()).add(node.geometry.uuid); } });
    let tailError = 0, tailHash = 2166136261;
    if (d.tailSurface) {
      const p = d.tailSurface.geometry.getAttribute('position'), raw = api.mammalSurface(id, 'tail').positions, words = new Uint32Array(p.array.buffer, p.array.byteOffset, p.array.length), trim = -art.tailCurl * .12 + art.tailPitch * .35;
      for (let k = 0; k < p.count; k++) { const target = api.mammalTailPoint(...raw.slice(k * 3, k * 3 + 3), art.tailCurl, trim); for (let axis = 0; axis < 3; axis++) { const at = k * 3 + axis; tailError = Math.max(tailError, Math.abs(p.array[at] - target[axis])); tailHash = Math.imul(tailHash ^ words[at], 16777619); } }
    }
    return { feet, variants: Object.fromEntries(Object.entries(variants).map(([key, values]: any) => [key, [...values]])), creases, art, headRoll: d.head.rotation.x, tailYaw: d.tail.rotation.y, tailCurl: d.tail.userData.distal?.rotation.y || 0, head: d.head.matrix.toArray(), tail: d.tail.matrix.toArray(), tailError, tailHash: tailHash >>> 0 };
  }, id);
}

test('four shared sculpted paw variants preserve rendered sole support while recorded turns counterbalance the real head and tail and rewind exactly', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page);
  const targets = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, out: any = {};
    for (const id of ['foxes', 'rabbits']) {
      const target: any = {}; out[id] = target;
      w.__clearanceControlFrames.baseline.forEach((frame: any, step: number) => {
        const pose = frame[id][0]; if (!pose.active) return;
        const art = api.mammalArticulation(id, pose, false), sample = { branch: 'baseline', step, index: 0, pose, art, noTurn: api.mammalArticulation(id, { ...pose, turnBalance: 0 }, false) };
        if (!target.ground && pose.footPlants.every((foot: any) => foot.planted) && pose.pounce < .01) target.ground = sample;
        if (pose.pounce < .01 && (!target.turn || Math.abs(art.turnBalance) > Math.abs(target.turn.art.turnBalance))) target.turn = sample;
      });
    }
    return out;
  });
  await choose(page, 'foxes', targets.foxes.ground); await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  const variantHashes = new Set<number>();
  for (const id of ['foxes', 'rabbits']) {
    expect(Math.abs(targets[id].turn.art.turnBalance)).toBeGreaterThan(.05);
    let ground: any = null, turn: any = null;
    for (const label of ['ground', 'turn']) {
      await choose(page, id, targets[id][label]); const rig = await pawRig(page, id);
      expect(Object.keys(rig.variants)).toHaveLength(4); for (const geometries of Object.values(rig.variants)) expect(geometries).toHaveLength(1);
      expect(rig.creases).toBe(0);
      for (const foot of rig.feet) {
        expect(foot).toMatchObject({ vertices: 1225, triangles: 2208, invalidNormals: 0, materialVertexColors: false, children: 0, drawn: true });
        expect(foot.error).toBeLessThan(1e-7); expect(foot.batchError).toBeLessThan(2e-6); expect(foot.upright).toBeGreaterThan(0);
        expect(foot.samplingGap).toBeGreaterThanOrEqual(-1e-7); expect(foot.samplingGap).toBeLessThan(.0004);
        expect(foot.minimumGap - foot.analyticGap).toBeCloseTo(foot.samplingGap, 10);
        const scale = id === 'foxes' ? [.078, .042, .052] : foot.hind ? [.175, .05, .075] : [.12, .045, .07];
        foot.scale.forEach((value: number, k: number) => expect(value).toBeCloseTo(scale[k], 12));
        expect(foot.local[0]).toBeCloseTo(0, 12); expect(foot.local[1]).toBeCloseTo(id === 'foxes' ? 0 : -.1, 12); expect(foot.local[2]).toBeCloseTo(0, 12);
        if (foot.planted) expect(Math.abs(foot.analyticGap - .002)).toBeLessThan(.008);
        if (label === 'ground') variantHashes.add(foot.hash);
      }
      expect(rig.headRoll).toBeCloseTo(rig.art.headRoll, 12); expect(rig.tailYaw).toBeCloseTo(rig.art.tailYaw, 12); expect(rig.tailCurl).toBeCloseTo(rig.art.tailCurl, 12); expect(rig.tailError).toBeLessThan(1e-6);
      if (label === 'ground') ground = rig; else turn = rig;
      await meadow.getByRole('button', { name: 'Side view', exact: true }).click(); await meadow.getByRole('button', { name: 'Rotate left', exact: true }).click(); await meadow.getByRole('button', { name: 'Raise view', exact: true }).click(); await meadow.getByLabel('Meadow camera distance', { exact: true }).fill('8');
      await stage.screenshot({ path: `${reportDir}/${id}-${label}-paws-turn.jpg`, type: 'jpeg', quality: 92 });
    }
    for (let k = 0; k < 4; k++) { expect(turn.feet[k].geometry).toBe(ground.feet[k].geometry); expect(turn.feet[k].material).toBe(ground.feet[k].material); }
    expect(turn.head).not.toEqual(ground.head); expect(turn.tail).not.toEqual(ground.tail);
    const sample = targets[id].turn, balance = sample.art.turnBalance;
    expect(sample.art.headRoll - sample.noTurn.headRoll).toBeCloseTo(-balance * (id === 'foxes' ? .035 : .025), 12);
    expect(sample.art.tailYaw - sample.noTurn.tailYaw).toBeCloseTo(-balance * (id === 'foxes' ? .19 : .018), 12);
    if (id === 'foxes') { expect(sample.art.tailCurl - sample.noTurn.tailCurl).toBeCloseTo(-balance * .12, 12); expect(turn.tailHash).not.toBe(ground.tailHash); }
    await choose(page, id, targets[id].ground); await choose(page, id, targets[id].turn); expect(await pawRig(page, id)).toEqual(turn);
    await choose(page, id, { branch: 'baseline', step: 0, index: 0 }); await page.emulateMedia({ reducedMotion: 'reduce' }); const frozen = await pawRig(page, id);
    expect(frozen.art.turnBalance).toBe(0); await timeline.fill('160'); expect(await pawRig(page, id)).toEqual(frozen); await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose'); await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  expect(variantHashes.size).toBe(4);
});

test('grounded peer reservations shorten a real recorded step without replacing its action, while spacing encounters and four still recovery checks remain available', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page, 'Rabbit neighbors');
  const evidence = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, frames = w.__clearanceControlFrames.baseline, config = w.__toolData.ecosystem.foodWeb.run.config; let selected: any = null, checked = 0; const violations: any[] = [], episodes: any[] = [];
    const grounded = (pose: any) => pose?.active && pose.huntStage !== 'airborne' && api.mammalArticulation('rabbits', pose, false).supportFeet > 0;
    for (let step = 1; step < frames.length; step++) {
      const old = frames[step - 1].rabbits, now = frames[step].rabbits;
      now.forEach((p: any, index: number) => {
        const peer = p.peerAvoidance, q0 = peer && old[peer.index], q1 = peer && now[peer.index];
        if (peer && peer.fraction > 0 && peer.fraction < 1 && [old[index], p, q0, q1].every(grounded) && Math.hypot(old[index].x - q0.x, old[index].z - q0.z) >= peer.radius + 1e-6 && Math.hypot(p.x - q1.x, p.z - q1.z) >= peer.radius - 1e-9 && !selected) selected = { branch: 'baseline', step, index, pose: p, old: old[index], peerOld: q0, peerNow: q1, why: api.explainBehavior('rabbits', p) };
        if (p.recoveryCue?.age === 0) { const still = []; for (let k = step; k < frames.length; k++) { const next = frames[k].rabbits[index]; if (!next.recoveryCue) break; if (next.recoveryCue.stage === 'still') still.push({ step: k, pose: next }); } if (still.length === 4) episodes.push({ index, still }); }
      });
      for (let i = 0; i < now.length; i++) for (let j = i + 1; j < now.length; j++) {
        const a = old[i], b = now[i], c = old[j], d = now[j], radius = api.peerRadius('rabbits', i) + api.peerRadius('rabbits', j) + .025;
        if (![a, b, c, d].every(grounded) || Math.hypot(a.x - c.x, a.z - c.z) < radius - 1e-9) continue;
        const rx = a.x - c.x, rz = a.z - c.z, vx = b.x - a.x - d.x + c.x, vz = b.z - a.z - d.z + c.z, speed2 = vx * vx + vz * vz, t = speed2 ? Math.max(0, Math.min(1, -(rx * vx + rz * vz) / speed2)) : 0, minimum = Math.hypot(rx + t * vx, rz + t * vz);
        checked++; if (minimum < radius - 1e-8 && violations.length < 10) violations.push({ step, i, j, minimum, radius });
      }
    }
    return { selected, checked, violations, episode: episodes[0], spacing: api.encounters(frames, config).find((encounter: any) => encounter.kind === 'spacing') };
  });
  expect(evidence.checked).toBeGreaterThan(1000); expect(evidence.violations).toEqual([]); expect(evidence.selected).toBeTruthy(); expect(evidence.episode).toBeTruthy(); expect(evidence.spacing).toBeTruthy();
  const sample = evidence.selected, peer = sample.pose.peerAvoidance;
  expect(Math.hypot(sample.old.x - sample.peerOld.x, sample.old.z - sample.peerOld.z)).toBeGreaterThanOrEqual(peer.radius);
  expect(Math.hypot(sample.pose.x - sample.peerNow.x, sample.pose.z - sample.peerNow.z)).toBeGreaterThanOrEqual(peer.radius - 1e-9);
  expect(peer.x).toBe(sample.peerOld.x); expect(peer.z).toBe(sample.peerOld.z); expect(peer.index).not.toBe(sample.index); expect(peer.id).toBe('rabbits');
  expect(peer.allowedDistance).toBeCloseTo(Math.hypot(sample.pose.x - sample.old.x, sample.pose.z - sample.old.z), 10); expect(peer.allowedDistance).toBeCloseTo(peer.requestedDistance * peer.fraction, 10);
  if (peer.source === 'committed-step') { expect(peer.nextX).toBe(sample.peerNow.x); expect(peer.nextZ).toBe(sample.peerNow.z); } else { expect(peer.nextX).toBe(sample.peerOld.x); expect(peer.nextZ).toBe(sample.peerOld.z); }
  await choose(page, 'rabbits', sample); await expect(canvas).toHaveAttribute('data-peer-avoidance', JSON.stringify(peer)); await expect(canvas).toHaveAttribute('data-behavior', sample.pose.state);
  await expect(meadow.getByRole('button', { name: 'Isolate specimen', exact: true })).toHaveAttribute('aria-pressed', 'false');
  const visibleBodies = await page.evaluate(({ actorIndex, peerIndex }) => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animals = scene.children.filter((animal: any) => animal.userData.headSurface?.name === 'eco-rabbits-head-surface');
    function shown(part: any) { for (let node = part; node; node = node.parent) if (!node.visible) return false; return true; }
    return [actorIndex, peerIndex].map(index => {
      const animal = animals[index], root = new T.Vector3().setFromMatrixPosition(animal.matrixWorld), radius = api.peerRadius('rabbits', index);
      const surfaces = [animal.userData.headSurface, animal.userData.torso].map((mesh: any) => {
        const positions = mesh.geometry.getAttribute('position'); let maximum = 0;
        for (let k = 0; k < positions.count; k++) { const point = new T.Vector3().fromBufferAttribute(positions, k).applyMatrix4(mesh.matrixWorld); maximum = Math.max(maximum, Math.hypot(point.x - root.x, point.z - root.z)); }
        const batch = scene.children.find((node: any) => node.isInstancedMesh && node.userData.parts?.includes(mesh)), instance = batch.userData.parts.filter(shown).indexOf(mesh), matrix = new T.Matrix4(); batch.getMatrixAt(instance, matrix);
        return { name: mesh.name, maximum, drawn: instance >= 0 && instance < batch.count, batchError: Math.max(...matrix.elements.map((value: number, k: number) => Math.abs(value - mesh.matrixWorld.elements[k]))) };
      });
      return { index, visible: shown(animal), root: { x: root.x, z: root.z }, radius, surfaces };
    });
  }, { actorIndex: sample.index, peerIndex: peer.index });
  for (const body of visibleBodies) {
    expect(body.visible).toBe(true); for (const surface of body.surfaces) { expect(surface.drawn).toBe(true); expect(surface.batchError).toBeLessThan(2e-6); expect(surface.maximum).toBeLessThanOrEqual(body.radius + 1e-6); }
  }
  expect(visibleBodies[0].index).toBe(sample.index); expect(visibleBodies[1].index).toBe(peer.index);
  expect(visibleBodies[0].root.x).toBeCloseTo(sample.pose.x, 10); expect(visibleBodies[0].root.z).toBeCloseTo(sample.pose.z, 10); expect(visibleBodies[1].root.x).toBeCloseTo(sample.peerNow.x, 10); expect(visibleBodies[1].root.z).toBeCloseTo(sample.peerNow.z, 10);
  expect(peer.radius).toBeCloseTo(visibleBodies[0].radius + visibleBodies[1].radius + .025, 12);
  expect(Math.hypot(visibleBodies[0].root.x - visibleBodies[1].root.x, visibleBodies[0].root.z - visibleBodies[1].root.z)).toBeGreaterThanOrEqual(visibleBodies[0].radius + visibleBodies[1].radius + .025 - 1e-9);
  await test.info().attach('actual-head-torso-peer-envelopes', { body: JSON.stringify({ sample: { step: sample.step, actor: sample.index, peer: peer.index, metadata: peer }, bodies: visibleBodies }), contentType: 'application/json' });
  const why = meadow.locator('[data-efw-action-reason]'); await why.locator('summary').click(); await expect(why.locator('[data-efw-action-explanation]')).toHaveText(sample.why.text); await expect(why).toContainText('clearance');
  await meadow.getByRole('button', { name: 'Side view', exact: true }).click(); await meadow.getByLabel('Meadow camera distance', { exact: true }).fill('8'); await stage.screenshot({ path: `${reportDir}/rabbit-peer-clearance.jpg`, type: 'jpeg', quality: 92 });
  await meadow.getByRole('button', { name: 'View from above', exact: true }).click(); await stage.screenshot({ path: `${reportDir}/rabbit-peer-clearance-above.jpg`, type: 'jpeg', quality: 92 });
  const savedCue = await canvas.getAttribute('data-peer-avoidance'); await timeline.fill(String(sample.step + 3)); await timeline.fill(String(sample.step)); await expect(canvas).toHaveAttribute('data-peer-avoidance', savedCue!);
  const episode = evidence.episode; await choose(page, 'rabbits', { step: episode.still[0].step, index: episode.index });
  for (const point of episode.still) { await timeline.fill(String(point.step)); expect(point.pose.speed).toBe(0); expect(point.pose.moving).toBe(0); await expect(canvas).toHaveAttribute('data-recovery-cue', JSON.stringify(point.pose.recoveryCue)); expect(point.pose.x).toBe(episode.still[0].pose.x); expect(point.pose.z).toBe(episode.still[0].pose.z); }
  const fieldwork = meadow.locator('[data-efw-fieldwork]'); await fieldwork.locator('[data-efw-encounter="spacing"]').click(); await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('avoid'); await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click(); await expect(fieldwork).toContainText('Recorded action: Giving space');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(canvas).toHaveAttribute('data-peer-avoidance', ''); await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
});

test('a controlled comparison separates background decline from positive extra modeled change and preserves exact frozen evidence and first estimates through revision and reopening', async ({ page }) => {
  const prediction = 'Removing foxes may let rabbits retain more biomass than the matching baseline, even if both branches decline.';
  await base(page, 'Shared-prey web', prediction); await page.getByLabel('Chart group', { exact: true }).selectOption('rabbits');
  await expect(page.locator('[data-efw-meadow]')).toHaveCount(0);
  const panel = page.locator('[data-efw-control-study]'), time = page.getByLabel('Food-web comparison time', { exact: true });
  await panel.locator('summary').focus(); await page.keyboard.press('Enter'); await expect(panel).toHaveAttribute('open', '');
  await expect(panel).toContainText('Recapturing starts a new comparison');
  const expected = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config, pair = api.compare(config), before = api.controlSample(pair, config, 'rabbits', 40), after = api.controlSample(pair, config, 'rabbits', 160);
    return { evidence: api.controlEvidence(config, 'rabbits', before, after), run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  });
  expect(expected.evidence.changes.experiment).toBeLessThan(0); expect(expected.evidence.changes.extra).toBeGreaterThan(0);
  await time.fill('80'); await expect(panel.getByRole('button', { name: 'Capture before-event sample', exact: true })).toBeDisabled();
  await time.fill('40'); await panel.getByRole('button', { name: 'Capture before-event sample', exact: true }).click(); await expect(panel.getByRole('button', { name: 'Capture after-event sample', exact: true })).toBeDisabled();
  await time.fill('160'); await panel.getByRole('button', { name: 'Capture after-event sample', exact: true }).click();
  const labels = ['Baseline change', 'Experiment change', 'Extra modeled change'];
  for (const label of labels) await expect(panel.getByLabel(label + ' number', { exact: true })).toHaveValue('');
  const check = panel.getByRole('button', { name: 'Compare my estimates', exact: true }); await expect(check).toBeDisabled();
  await panel.getByLabel(labels[0] + ' estimate', { exact: true }).focus(); await page.keyboard.press('Enter'); await expect(panel.getByLabel(labels[0] + ' number', { exact: true })).toHaveValue('0'); await expect(check).toBeDisabled();
  for (const label of labels.slice(1)) await panel.getByLabel(label + ' number', { exact: true }).fill('0');
  await check.click(); await expect(panel.locator('[data-efw-control-feedback]')).toContainText('0 of 3 estimates agree');
  const rounded = Object.fromEntries(Object.entries(expected.evidence.changes).map(([key, value]: any) => [key, Math.round((value + Number.EPSILON) * 10) / 10]));
  for (const [k, key] of ['baseline', 'experiment', 'extra'].entries()) await panel.getByLabel(labels[k] + ' number', { exact: true }).fill(String(rounded[key]));
  const draft = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.controlStudy.estimates));
  await panel.getByRole('button', { name: 'Inspect captured before time', exact: true }).click(); await expect(time).toHaveValue('40'); await time.fill('200'); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.controlStudy.estimates))).toBe(draft);
  await panel.getByRole('button', { name: 'Compare revised estimates', exact: true }).click(); await expect(panel.locator('[data-efw-control-feedback]')).toContainText('3 of 3 estimates agree to the nearest 0.1 index. First comparison: 0 of 3.');
  const reflection = 'The experiment fell, but the baseline fell farther. Subtracting the negative background change gives a positive extra modeled change; it is not a measured wildlife effect.';
  await panel.getByLabel('Controlled comparison reflection', { exact: true }).fill(reflection); await panel.getByRole('button', { name: 'Save controlled comparison', exact: true }).click();
  const note = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]), saved = JSON.stringify(note);
  expect(note.controlStudy).toMatchObject({ before: expected.evidence.before, after: expected.evidence.after, estimates: rounded, firstEstimates: { baseline: 0, experiment: 0, extra: 0 }, reflection, runPrediction: prediction }); expect(note.step).toBe(160); expect(note.explanation).toBe(reflection); expect(note.prediction).toContain('baseline 0; experiment 0; extra 0');
  const text = await page.evaluate(() => (window as any).StemLab.ecosystemFoodWeb.notebookText((window as any).__toolData.ecosystem.foodWeb.notebook)), line = text.split('\n').find((line: string) => line.startsWith('Frozen controlled-comparison evidence (JSON): '));
  expect(JSON.parse(line.slice('Frozen controlled-comparison evidence (JSON): '.length))).toEqual(note.controlStudy);
  await panel.screenshot({ path: `${reportDir}/controlled-comparison-evidence.jpg`, type: 'jpeg', quality: 92 });
  await time.fill('160'); await panel.getByRole('button', { name: 'Capture after-event sample', exact: true }).click();
  for (const label of labels) await expect(panel.getByLabel(label + ' number', { exact: true })).toHaveValue('');
  await expect(panel.getByRole('button', { name: 'Compare my estimates', exact: true })).toBeDisabled(); await expect(panel.getByLabel('Controlled comparison reflection', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-efw-notebook]').getByRole('button', { name: 'Reopen observation 1', exact: true }).click();
  await expect(panel).toHaveAttribute('open', ''); await expect(panel.getByLabel('Controlled comparison reflection', { exact: true })).toHaveValue(reflection); await expect(panel.locator('[data-efw-control-feedback]')).toContainText('First comparison: 0 of 3.');
  await expect(page.getByLabel('Your prediction (optional)', { exact: true })).toHaveValue(prediction);
  await panel.screenshot({ path: `${reportDir}/mobile-reduced-controlled-comparison.jpg`, type: 'jpeg', quality: 92 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const revised = 'These are two frozen model times, not repeated wildlife samples. I kept the original prediction and changed only this reflection.';
  await panel.getByLabel('Controlled comparison reflection', { exact: true }).fill(revised); await panel.getByRole('button', { name: 'Save controlled comparison', exact: true }).click();
  const second = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[1]); expect(second.controlStudy.firstEstimates).toEqual(note.controlStudy.firstEstimates); expect(second.controlStudy.estimates).toEqual(note.controlStudy.estimates); expect(second.explanation).toBe(revised); expect(second.controlStudy.reflection).toBe(revised);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved); expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(expected.run);
});
