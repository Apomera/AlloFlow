// Every catalogue tab opens with a sentence that claims a number ("40 hotspots
// catalogued", "60 quick review questions"). Compare each claim against what the
// tab actually renders. A claim and the thing it claims about should have ONE
// derivation; when they drift, the tool asserts something its own content
// contradicts — and nothing else in the suite would notice.
//   node dev-tools/pt_count_claims.cjs <out-dir> [tab,tab,...]
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
const TABS = (process.argv[3] || 'encyclopedia,volcanoes,hotspots,tsunamis,rocks,minerals,faults,mountains,glossary,review,lessons,concepts,faq,resources,dinosaurs,fossils,extinctions,periods,parks,caves,events,impacts,eruptions,quakeStories,plateProfiles,boundaries,seafloor,us_states,landforms,geothermal,critical_minerals,methods,expeditions,submersibles,projects,women,indigenous,climate,insights,history,biographies,maine,careers,paleo,hominids,preparedness,outcrops,about').split(',');
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  const rows = [];
  for (const tab of TABS) {
    await pg.evaluate((t) => window.__mount(false, t), tab);
    await pg.waitForTimeout(700);
    const r = await pg.evaluate(() => {
      // The tab's own panel is the first .rounded-2xl after the challenge strip
      // that is not the header; take the biggest one, which is the catalogue.
      const panels = Array.from(document.querySelectorAll('.rounded-2xl'))
        .filter((e) => e.querySelector('h3'))
        .sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height);
      const panel = panels[0];
      if (!panel) return null;
      const heading = (panel.querySelector('h3') || {}).textContent || '';
      const intro = (panel.querySelector('p') || {}).textContent || '';
      // Cards: direct-ish children that look like list entries.
      const cards = panel.querySelectorAll('.rounded-lg');
      const claims = [];
      const re = /(\d[\d,]*)\s*\+?\s*([a-z][a-z\- ]{2,28})/gi;
      let m;
      while ((m = re.exec(intro))) claims.push({ n: parseInt(m[1].replace(/,/g, ''), 10), what: m[2].trim().toLowerCase() });
      return { heading: heading.trim().slice(0, 40), intro: intro.trim().slice(0, 150), cards: cards.length, claims };
    });
    if (!r) { console.log(tab.padEnd(18) + 'no panel'); continue; }
    rows.push({ tab, ...r });
  }
  rows.forEach((r) => {
    // Report a claim whose number is close to a plausible card count but not
    // equal, and any claim that is an exact match (to show the check works).
    const notes = r.claims.map((c) => {
      const exact = c.n === r.cards;
      return c.n + ' ' + c.what + (exact ? '  == rendered ' + r.cards : '  (rendered ' + r.cards + ')');
    });
    console.log(r.tab.padEnd(18) + 'cards=' + String(r.cards).padEnd(5) + (notes.length ? notes.join(' ; ') : 'no numeric claim'));
  });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
