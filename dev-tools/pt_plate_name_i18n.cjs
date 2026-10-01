// Eight plate/hotspot names were bare strings beside 133 wrapped siblings, so
// they never translated in any language. Wrapping the call site proves nothing
// on its own: ui_strings OVERRIDES the fallback, so the only honest check is to
// put a DISTINCT value in the registry and see it on screen.
//
// Also drives the search box, because PLATE_DB's filter reads p.name -
// translating a name a student can no longer search for would trade one defect
// for another.
//   node dev-tools/pt_plate_name_i18n.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];

const PROBE = {
  indo_australian: 'ZZ-INDO',
  izu_bonin: 'ZZ-IZU',
  yap: 'ZZ-YAP',
  songpan_garze: 'ZZ-SONGPAN',
  yukon_tanana: 'ZZ-YUKON',
  mojave_sonora: 'ZZ-MOJAVE'
};

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 1400 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));

  // Overwrite the registry the harness reads, BEFORE mounting.
  await pg.evaluate((probe) => {
    const u = window.__uiStrings = window.__uiStrings || {};
    u.stem = u.stem || {}; u.stem.platetectonics = u.stem.platetectonics || {};
    Object.keys(probe).forEach((k) => { u.stem.platetectonics[k] = probe[k]; });
  }, PROBE);

  await pg.evaluate(() => window.__mount(false, "encyclopedia"));
  await pg.waitForTimeout(1400);

  const shown = await pg.evaluate((probe) => {
    const t = document.body.innerText || '';
    const out = {};
    Object.keys(probe).forEach((k) => { out[k] = t.includes(probe[k]); });
    // "Indo-Australian" also appears INSIDE other prose - tsunami and fault
    // notes that are separately wrapped - so its presence on the page says
    // nothing about the plate label. Check the label's own cell instead: the
    // heading of the card whose body mentions the Sunda trench.
    const cells = [...document.querySelectorAll('h3, h4, .font-bold, .font-black')];
    out._labelStillEnglish = cells.some((e) => (e.textContent || '').trim() === 'Indo-Australian');
    return out;
  }, PROBE);

  // Search the TRANSLATED name: the filter lowercases p.name, so a translated
  // plate must still be findable by what the student can actually see.
  let searched = null;
  const box = await pg.$('input[placeholder^="Search plates"]');
  if (box) {
    await box.fill('zz-izu');
    await pg.waitForTimeout(500);
    searched = await pg.evaluate(() => {
      const t = document.body.innerText || '';
      return { hitsIzu: t.includes('ZZ-IZU'), hitsOther: t.includes('ZZ-YAP') };
    });
  }

  console.log(JSON.stringify({ shown, searched, hadSearchBox: !!box }, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
