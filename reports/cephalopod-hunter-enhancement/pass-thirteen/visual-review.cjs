const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const generated = path.join(__dirname, 'capture-harness.generated.cjs');
require('esbuild').buildSync({ entryPoints: [path.resolve(__dirname, '../../../tests/e2e/helpers/stem_gl_harness.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: generated, external: ['@playwright/test'] });
const { GlHarness } = require(generated);
const initial = process.argv.includes('--initial'), prefix = initial ? 'initial-' : '';
const selected = process.argv.find(arg => arg.startsWith('--species='))?.slice('--species='.length);
(async () => {
  const harness = new GlHarness({ toolFile: initial ? 'reports/cephalopod-hunter-enhancement/pass-thirteen/baseline.generated.cjs' : 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 1100, height: 1000, layout: 'document' });
  await harness.start();
  const browser = await chromium.launch({ headless: true }), errors = [], captures = [], floorAudits = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
    page.setDefaultTimeout(90000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    for (const species of selected ? [selected] : initial ? ['commonOcto', 'blueRinged'] : ['commonOcto', 'blueRinged', 'giantPacific', 'mimicOcto', 'caribReef', 'coconutOcto']) {
      await page.setViewportSize({ width: 1280, height: 1100 });
      await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: species, huntMode: 'observe', huntSeed: 2741, huntQuality: 'balanced', _threeLoaded: true } });
      const canvas = page.locator('canvas[role=application]');
      await canvas.waitFor();
      await page.waitForFunction(() => parseInt(document.querySelector('[data-hud=time]')?.textContent || '0') >= 1);
      await canvas.focus(); await page.keyboard.press('KeyF');
      await page.getByRole('button', { name: 'Anatomy labels', exact: true }).click();
      await page.getByRole('button', { name: 'Orbit right', exact: true }).click();
      await page.getByRole('button', { name: 'Higher', exact: true }).click();
      await page.waitForTimeout(250);
      if (species === 'giantPacific') {
        const audit = await page.evaluate(() => {
          const w = window, T = w.THREE, scene = w.__glRecorder.records.filter(row => row.scene && row.canvas.isConnected).at(-1).scene;
          scene.updateMatrixWorld(true);
          const player = scene.getObjectByName('cl-player'), floor = scene.getObjectByName('cl-seafloor'), position = floor.geometry.attributes.position;
          const cols = floor.geometry.parameters.widthSegments, rows = floor.geometry.parameters.heightSegments, width = floor.geometry.parameters.width, height = floor.geometry.parameters.height;
          const inverse = floor.matrixWorld.clone().invert(), point = new T.Vector3(), local = new T.Vector3(), contact = new T.Vector3();
          let minimum = Infinity, vertices = 0;
          player.traverse(mesh => {
            if (!mesh.isMesh || !/^cl-arm-\d+$/.test(mesh.name)) return;
            for (let vertex = 0; vertex < mesh.geometry.attributes.position.count; vertex++) {
              point.fromBufferAttribute(mesh.geometry.attributes.position, vertex).applyMatrix4(mesh.matrixWorld); local.copy(point).applyMatrix4(inverse);
              const u = (local.x + width / 2) / width * cols, v = (height / 2 - local.y) / height * rows, x = Math.floor(u), y = Math.floor(v), fu = u - x, fv = v - y;
              if (x < 0 || y < 0 || x >= cols || y >= rows) throw new Error('Arm lies outside rendered floor tile');
              const a = x + (cols + 1) * y, b = a + cols + 1, c = b + 1, d = a + 1;
              const za = position.getZ(a), zb = position.getZ(b), zc = position.getZ(c), zd = position.getZ(d);
              const z = fu + fv <= 1 ? za + (zd - za) * fu + (zb - za) * fv : zc + (zb - zc) * (1 - fu) + (zd - zc) * (1 - fv);
              contact.set(local.x, local.y, z).applyMatrix4(floor.matrixWorld);
              minimum = Math.min(minimum, point.y - contact.y); vertices++;
            }
          });
          return { species: 'giantPacific', vertices, minimum, playerY: player.position.y, method: 'Every rendered arm vertex against actual floor mesh triangle interpolation' };
        });
        floorAudits.push(audit);
        if (!initial && (audit.vertices < 100 || !Number.isFinite(audit.minimum) || audit.minimum < .005)) throw new Error('Giant octopus arms intersect rendered floor: ' + JSON.stringify(audit));
      }
      const file = prefix + species + '-eyes.png'; await canvas.screenshot({ path: path.join(__dirname, file) }); captures.push(file);
      if (species === 'commonOcto') {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => { document.getElementById('wrap').style.width = '100%'; window.dispatchEvent(new Event('resize')); });
        await page.waitForTimeout(250);
        const phone = prefix + 'octopus-phone.png'; await canvas.screenshot({ path: path.join(__dirname, phone) }); captures.push(phone);
        await page.setViewportSize({ width: 1280, height: 1100 });
        await page.evaluate(() => { document.getElementById('wrap').style.width = '1100px'; window.dispatchEvent(new Event('resize')); });
      }
    }
    if (!selected) {
    // A diagnostic camera only: keep the real rocks, lights, shader, fog and terrain.
    await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'observe', huntSeed: 2741, huntQuality: 'balanced', _threeLoaded: true } });
    await page.waitForFunction(() => parseInt(document.querySelector('[data-hud=time]')?.textContent || '0') >= 1);
    await page.evaluate(() => {
      const w = window, record = w.__glRecorder.records.filter(row => row.scene && row.canvas.isConnected).at(-1), scene = record.scene;
      w.THREE.Clock.prototype.getDelta = function () { return 0; };
      const rocks = scene.children.filter(object => object.userData.substrate === 'rock').sort((a, b) => a.position.lengthSq() - b.position.lengthSq());
      if (!rocks.length) throw new Error('No reef rocks');
      const rock = rocks[0], T = w.THREE;
      const fixture = { rockPosition: rock.position.toArray(), rockQuaternion: rock.quaternion.toArray(), rockScale: rock.scale.toArray(), radius: rock.userData.substrateRadius };
      scene.onBeforeRender = function (renderer, renderedScene, camera) {
        camera.position.copy(rock.position).add(new T.Vector3(3.0, 2.1, 3.7));
        camera.lookAt(rock.position.clone().add(new T.Vector3(0, .35, 0))); camera.updateMatrixWorld(true);
      };
      w.__rockFixture = fixture;
    });
    await page.waitForTimeout(250);
    const rockFile = prefix + 'reef-rock-detail.png'; await page.locator('canvas[role=application]').screenshot({ path: path.join(__dirname, rockFile) }); captures.push(rockFile);
    const rockFixture = await page.evaluate(() => window.__rockFixture);
    if (!initial) {
      const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'rock-detail-fixture.json'), 'utf8'));
      if (JSON.stringify(rockFixture) !== JSON.stringify(expected)) throw new Error('Seeded rock identity or transform changed');
    }
    fs.writeFileSync(path.join(__dirname, prefix + 'rock-detail-fixture.json'), JSON.stringify(rockFixture, null, 2) + '\n');
    }
    const result = { errors, captures, floorAudits, fixture: 'Normal balanced field-study model inspection: standard F pause, labels toggle, Orbit right and Higher. Phone uses390×844. Rock detail changes only the camera to a seeded nearby real boulder; no model, light, material or visibility overrides.' };
    fs.writeFileSync(path.join(__dirname, prefix + (selected ? selected + '-' : '') + 'capture-results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result)); if (errors.length) process.exitCode = 1;
  } finally { await browser.close(); await harness.stop(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
