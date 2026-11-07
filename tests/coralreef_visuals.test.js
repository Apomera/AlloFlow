import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Lane visuals: the scenario picker pictures and the richer "reef in year N"
// picture. Every mark in them is taken from the model's own data: heat marks
// from the scenario's heatwave spacing rule, fish from its protection level,
// a runoff cloud from its runoff level, rubble and Reef Stars from its start
// and actions; the year picture from the year's cover through the 24 spots.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let X;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; });

const parse = (html) => new DOMParser().parseFromString('<!doctype html><body>' + html + '</body>', 'text/html');
const page = (state, theme) => parse(renderTool('coralReef', { coralReef: Object.assign({ section: 'model' }, state) }, theme ? { theme } : undefined));
const NAMES = { recent: 'Recent pattern', reserve: 'Protected reef', warmer: 'Faster warming', cooler: 'Optimistic what-if', rubble: 'Restore a rubble field' };

describe('scenario vignettes', () => {
  it('draws one heat mark per severe heatwave by the scenario\'s own spacing rule', () => {
    const doc = page({});
    for (const s of X.SCENARIOS) {
      const st = X.scenarioSettings(s.id), marks = X.scnHeatMarks(st);
      const svg = doc.querySelector('svg[data-scn-vignette="' + s.id + '"]');
      expect(svg, s.id).toBeTruthy();
      const hw = svg.querySelector('[data-heat-marks]');
      expect(+hw.getAttribute('data-heat-marks'), s.id).toBe(marks.length);
      expect(hw.getAttribute('data-heat-years'), s.id).toBe(marks.map((m) => m.year).join(' '));
      // One flame shape per mark.
      expect((hw.getAttribute('d').match(/M/g) || []).length, s.id).toBe(marks.length);
      // Gaps follow the interval rule: start gap at the start, end gap near year 30.
      for (let i = 1; i < marks.length; i++) {
        const t = marks[i - 1].year - 1, f = t / 29, iv = st.heatIntervalStart + (st.heatIntervalEnd - st.heatIntervalStart) * f;
        expect(marks[i].year - marks[i - 1].year, s.id + ' gap after year ' + marks[i - 1].year).toBe(Math.max(1, Math.round(iv)));
      }
      // Strength moves from the start peak to the end peak.
      marks.forEach((m) => expect(m.peak).toBeCloseTo(st.heatPeakStart + (st.heatPeakEnd - st.heatPeakStart) * (m.year - 1) / 29, 1));
    }
    const lastTen = (id) => X.scnHeatMarks(X.scenarioSettings(id)).filter((m) => m.year > 20).length;
    expect(lastTen('warmer')).toBeGreaterThan(2 * lastTen('recent'));
    expect(lastTen('cooler')).toBeLessThan(lastTen('recent'));
    expect(X.scnHeatMarks(X.scenarioSettings('reserve'))).toEqual(X.scnHeatMarks(X.scenarioSettings('recent')));
    // The rule's marks sit close to what heatSchedule gives (it adds jitter).
    for (const id of ['recent', 'warmer', 'cooler']) {
      const sched = X.heatSchedule(X.scenarioSettings(id), 11).filter((v) => v >= 6).length;
      expect(Math.abs(sched - X.scnHeatMarks(X.scenarioSettings(id)).length), id).toBeLessThanOrEqual(2);
    }
  });

  it('shows grazing fish, runoff, rubble, Reef Stars and the nursery from the data', () => {
    const doc = page({}), svg = (id) => doc.querySelector('svg[data-scn-vignette="' + id + '"]');
    const grazers = (id) => +svg(id).querySelector('[data-grazers]').getAttribute('data-grazers');
    const fishDrawn = (id) => (svg(id).querySelector('[data-grazers] path').getAttribute('d').match(/M/g) || []).length;
    for (const s of X.SCENARIOS) {
      const v = X.scnVignetteData(X.scenarioSettings(s.id));
      expect(grazers(s.id), s.id).toBe({ low: 1, medium: 2, high: 4 }[v.herbivores]);
      expect(fishDrawn(s.id), s.id).toBe(grazers(s.id));
      const run = svg(s.id).querySelector('[data-runoff]');
      if (v.runoff > 0) expect(+run.getAttribute('data-runoff'), s.id).toBe(v.runoff); else expect(run, s.id).toBeNull();
      expect(!!svg(s.id).querySelector('[data-reef-stars]'), s.id).toBe(!!(s.actions && s.actions.rubbleStabilization));
      expect(!!svg(s.id).querySelector('[data-nursery]'), s.id).toBe(!!(s.actions && s.actions.restoration));
    }
    expect(grazers('reserve')).toBeGreaterThan(grazers('recent'));
    expect(svg('reserve').querySelector('[data-runoff]')).toBeNull();
    expect(svg('recent').querySelector('[data-runoff]')).toBeTruthy();
    const pieces = (id) => { const r = svg(id).querySelector('[data-rubble-pieces]'); return r ? +r.getAttribute('data-rubble-pieces') : 0; };
    expect(pieces('rubble')).toBeGreaterThan(4 * Math.max(1, pieces('recent')));
    expect(pieces('rubble')).toBe(Math.round(X.scnVignetteData(X.scenarioSettings('rubble')).rubble * 16));
    expect(+svg('rubble').querySelector('[data-corals]').getAttribute('data-corals')).toBeLessThan(+svg('recent').querySelector('[data-corals]').getAttribute('data-corals'));
  });

  it('keeps the buttons accessible: name is the visible label, picture hidden, pressed state and a description from the data', () => {
    for (const id of Object.keys(NAMES)) {
      const doc = page({ model: X.scenarioSettings(id) });
      const buttons = [...doc.querySelectorAll('[role="group"] button[data-scn]')];
      expect(buttons.length).toBe(X.SCENARIOS.length);
      for (const b of buttons) {
        const sid = b.getAttribute('data-scn');
        expect(b.textContent.trim()).toBe(NAMES[sid]);
        expect(b.getAttribute('aria-pressed')).toBe(sid === id ? 'true' : 'false');
        const svg = b.querySelector('svg');
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expect(svg.getAttribute('focusable')).toBe('false');
        expect(svg.querySelector('text, title')).toBeNull();
        const desc = doc.getElementById(b.getAttribute('aria-describedby'));
        expect(desc, sid).toBeTruthy();
        expect(desc.textContent).toMatch(/Severe heatwaves/);
      }
      // The facts list in words, for the scenario in use.
      const facts = doc.querySelector('[data-scn-facts]');
      expect(facts.getAttribute('data-scn-facts')).toBe(id);
      expect(facts.textContent).toMatch(/Severe heatwaves/);
    }
    const warm = page({ model: X.scenarioSettings('warmer') }).querySelector('[data-scn-facts]').textContent;
    expect(warm).toContain('about every 6 years at the start, almost every year by year 30');
    expect(warm).toContain('from about 8 to 12 Degree Heating Weeks');
    const rub = page({ model: X.scenarioSettings('rubble') }).querySelector('[data-scn-facts]').textContent;
    expect(rub).toContain('loose rubble covers 80% of the bottom, with 3% live coral');
    expect(rub).toContain('Reef Stars');
    expect(rub).toContain('coral gardening');
    const rec = page({}).querySelector('[data-scn-facts]').textContent;
    expect(rec).toContain('about every 6 years, the whole 30 years');
    expect(rec).toContain('Protection for grazing fish: Medium. Nutrient runoff from land: Medium.');
    expect(/[\u2013\u2014\u2011]/.test(rec + warm + rub)).toBe(false);
  });

  it('lays the buttons out in a wrapping grid and pins any motion under reduced motion', () => {
    const doc = page({});
    const group = doc.querySelector('.crb-scn');
    expect(group.getAttribute('role')).toBe('group');
    const css = [...doc.querySelectorAll('style')].map((s) => s.textContent).join('');
    expect(css).toMatch(/\.crb-scn\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(1[0-4]\dpx,1fr\)\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{[^}]*\.crb-sway,[^}]*\.crb-rays\{animation:none/);
  });
});

describe('the starting reef before a run', () => {
  it('shows the year-0 picture on the pre-run page, drawn from the start numbers, and not after the run', () => {
    for (const id of ['recent', 'rubble']) {
      const st = X.scenarioSettings(id), rows = X.runScenario(st, 11);
      const doc = page({ model: st });
      const wrap = doc.querySelector('[data-mdl-start-art]');
      expect(wrap, id).toBeTruthy();
      const art = wrap.querySelector('svg[data-year-art]');
      expect(+art.getAttribute('data-year-art')).toBe(0);
      expect(Math.abs(+art.getAttribute('data-live-spots') - rows[0].coral * 24)).toBeLessThanOrEqual(1);
      expect(art.getAttribute('aria-label')).toContain('live coral ' + Math.round(rows[0].coral * 100) + '%');
      expect(wrap.textContent).toContain('The reef at the start (year 0)');
      expect(doc.querySelectorAll('svg[data-year-art]').length).toBe(1);
      // No result before the prediction.
      expect(doc.querySelector('svg[data-model-chart]')).toBeNull();
    }
    const after = page({ modelRevealedFor: { recent: true }, modelSurveyYear: 12 });
    expect(after.querySelector('[data-mdl-start-art]')).toBeNull();
    expect(+after.querySelector('svg[data-year-art]').getAttribute('data-year-art')).toBe(12);
  });
});

describe('the reef in year N picture', () => {
  const ALGAE = () => Object.assign(X.scenarioSettings('warmer'), { scenarioId: 'custom', herbivores: 'low', nutrients: 'high' });
  const art = (model, year, theme) => page({ model, modelRevealedFor: { [model.scenarioId]: true }, modelSurveyYear: year }, theme).querySelector('svg[data-year-art]');

  it('changes with the cover: more seaweed spots and seaweed drawings when seaweed is higher', () => {
    const m = ALGAE(), rows = X.runScenario(m, 11);
    const y0 = art(m, 0), y30 = art(m, 30);
    const weed = (a) => a.querySelectorAll('[data-spot-cat="macroalgae"]').length;
    expect(rows[30].algae).toBeGreaterThan(rows[0].algae + 0.3);
    expect(weed(y30)).toBeGreaterThan(weed(y0) + 6);
    expect(y30.querySelectorAll('[data-part="seaweed"]').length).toBe(weed(y30));
    // Every seaweed patch carries its calcareous green seaweed and sways.
    y30.querySelectorAll('[data-part="seaweed"]').forEach((g) => { expect(g.getAttribute('class')).toMatch(/crb-sway/); expect(g.querySelectorAll('path').length).toBeGreaterThanOrEqual(4); });
    // The spot mapping is the same 24 spots, in three tiers.
    expect(y30.querySelectorAll('[data-spot]').length).toBe(24);
    const tiers = [0, 8, 16].map((i) => X.yrPlace(i).k);
    expect(tiers[0]).toBeGreaterThan(tiers[1]);
    expect(tiers[1]).toBeGreaterThan(tiers[2]);
    expect(X.yrPlace(0).base).toBeGreaterThan(X.yrPlace(8).base);
    expect(X.yrPlace(8).base).toBeGreaterThan(X.yrPlace(16).base);
  });

  it('draws the far reef from the same live-coral count, and more rubble on the rubble field', () => {
    for (const [id, year] of [['recent', 0], ['recent', 30], ['rubble', 0], ['rubble', 30], ['warmer', 30]]) {
      const a = art(X.scenarioSettings(id), year);
      expect(+a.querySelector('[data-far-live]').getAttribute('data-far-live'), id + ' ' + year).toBe(+a.getAttribute('data-live-spots'));
    }
    const r0 = art(X.scenarioSettings('rubble'), 0), r30 = art(X.scenarioSettings('rubble'), 30);
    expect(r0.querySelectorAll('[data-spot-cat="rubble"]').length).toBeGreaterThan(3 * r30.querySelectorAll('[data-spot-cat="rubble"]').length);
    const farLen = (a) => a.querySelector('[data-far-live]').getAttribute('d').length;
    expect(farLen(r30)).toBeGreaterThan(farLen(r0));
  });

  it('keeps an accurate text alternative and the legend', () => {
    const st = X.scenarioSettings('recent'), rows = X.runScenario(st, 11);
    for (const year of [0, 12, 30]) {
      const doc = page({ model: st, modelRevealedFor: { recent: true }, modelSurveyYear: year });
      const a = doc.querySelector('svg[data-year-art]'), site = X.siteFromModelYear(rows[year], st, 0);
      expect(a.getAttribute('role')).toBe('img');
      const label = a.getAttribute('aria-label');
      expect(label).toContain('year ' + year);
      expect(label).toContain('live coral ' + Math.round(rows[year].coral * 100) + '%');
      expect(label).toContain('seaweed ' + Math.round(site.cover.macroalgae * 100) + '%');
      expect(label).toContain('rubble ' + Math.round(site.cover.rubble * 100) + '%');
      expect(doc.querySelectorAll('.crb-yearnums li').length).toBe(7);
    }
  });

  it('renders the same picture in all three themes and passes axe in each', async () => {
    const st = X.scenarioSettings('warmer');
    const strip = (a) => a.innerHTML.replace(/crb-year-[a-z0-9]+/gi, 'U');
    const light = art(st, 18, 'light');
    for (const theme of ['dark', 'contrast']) expect(strip(art(st, 18, theme)), theme).toBe(strip(light));
    for (const theme of ['light', 'dark', 'contrast']) {
      for (const state of [{}, { modelRevealedFor: { recent: true } }, { model: X.scenarioSettings('rubble'), modelRevealedFor: { rubble: true }, modelSurveyYear: 12 }]) {
        const html = renderTool('coralReef', { coralReef: Object.assign({ section: 'model' }, state) }, { theme });
        const result = await runIsolatedAxe(html);
        expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')), theme).toEqual([]);
      }
    }
  }, 120000);

  it('stays within a sane node budget in every scenario and year', () => {
    for (const id of ['recent', 'reserve', 'warmer', 'cooler', 'rubble']) for (const year of [0, 9, 18, 30]) {
      expect(art(X.scenarioSettings(id), year).querySelectorAll('*').length, id + ' ' + year).toBeLessThan(640);
    }
    expect(art(ALGAE(), 30).querySelectorAll('*').length).toBeLessThan(640);
    const doc = page({});
    doc.querySelectorAll('svg[data-scn-vignette]').forEach((s) => expect(s.querySelectorAll('*').length).toBeLessThan(60));
  });
});
