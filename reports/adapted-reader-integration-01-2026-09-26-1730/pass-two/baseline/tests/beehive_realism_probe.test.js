// Diagnostic probe (not an assertion suite): run the canonical colony stepper across a full
// simulated year and report what a beekeeper would actually experience, so the numbers can be
// checked against real apiculture instead of against intuition.
//
// This project's vitest config suppresses console output, so the report is written to a file.
//
// Reference figures for a strong Langstroth colony in a northern climate (Maine, the setting):
//   peak laying            1,500-2,000 eggs/day
//   worker development     21 days egg to adult
//   nectar on a good flow  5-15 lb/day gross for a strong colony
//   summer consumption     ~0.5-1 lb/day
//   annual consumption     60-80 lb, plus whatever is harvested
//   overwinter reserve     60-90 lb going into a northern winter
//   harvestable surplus    30-60 lb per productive hive per season
import { describe, it, beforeAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// tmpdir, not a hardcoded path: this has to run on anyone's machine, and the report is a
// diagnostic artefact rather than something the suite asserts on.
const REPORT = join(tmpdir(), 'beehive_realism_report.txt');
const OUT = [];
const log = (m) => OUT.push(String(m));

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
  if (!BH) throw new Error('beehive did not populate __RR_TEST_EXPORTS__');
});

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

function run(days, opts) {
  const o = opts || {};
  const cfg = {
    params: BH.SIMULATION_PARAMS,
    subMods: { honey: o.honeyMod || 1, spring: 1, winter: 1, varroa: 1 },
    siteMods: { forage: o.forage || 1, disease: 1 },
    gardenBonus: o.garden || 0,
    hiveEvents: [],
    diseaseEvents: [],
    rand: () => 0.99, // no random events: isolate the biology
  };
  let s = {
    day: 0, workers: 20000, brood: 6000, drones: 800, queenHealth: 100,
    honey: 40, pollen: 20, wax: 5, varroaLevel: 3, morale: 80,
    foragingEfficiency: o.fe || 70, habitat: o.habitat || 50, capacity: 200,
    pesticideExposure: 0, diseaseRisk: 0,
  };
  const rows = [];
  let peakHoney = s.honey;
  for (let i = 0; i < days; i++) {
    const prev = s;
    const r = BH.bhStepColony(s, cfg);
    s = Object.assign({}, s, r.next);
    peakHoney = Math.max(peakHoney, s.honey);
    // Sample every 6 days through the dearth window so it is visible in the report.
    const near = s.day >= 48 && s.day <= 66;
    if (i % 12 === 0 || (near && i % 3 === 0) || i === days - 1) {
      rows.push({
        day: s.day,
        season: SEASONS[Math.floor((prev.day % 120) / 30)],
        workers: s.workers, brood: s.brood, honey: s.honey,
        dHoney: +(s.honey - prev.honey).toFixed(2),
        gross: +(r.next.honeyGrossIn || 0).toFixed(2),
        // Population bookkeeping, because reasoning about it from the source was wrong once.
        dWorkers: s.workers - prev.workers,
        dBrood: s.brood - prev.brood,
      });
    }
  }
  return { rows, final: s, peakHoney };
}

describe('beehive realism probe', () => {
  it('reports a year of colony behaviour', () => {
    for (const sc of [
      { name: 'DEFAULT (fe 70, habitat 50, no garden, no subspecies bonus)', opts: {} },
      {
        name: 'BEST CASE (fe 100, habitat 100, garden 25, forage 1.3, honeyMod 1.3)',
        opts: { fe: 100, habitat: 100, garden: 25, forage: 1.3, honeyMod: 1.3 },
      },
    ]) {
      const { rows, final, peakHoney } = run(120, sc.opts);
      log('');
      log('===== ' + sc.name + ' =====');
      log('day  season    workers  dWork   brood  dBrood    honey   dHoney/d  grossIn/d');
      for (const r of rows) {
        log(String(r.day).padStart(3) + '  ' + r.season.padEnd(9)
          + String(r.workers).padStart(7) + String(r.dWorkers).padStart(7)
          + String(r.brood).padStart(8) + String(r.dBrood).padStart(8)
          + String(r.honey).padStart(9) + String(r.dHoney).padStart(11)
          + String(r.gross).padStart(11));
      }
      log('after one year: workers ' + final.workers + ', honey ' + final.honey
        + ' lb, PEAK honey ' + peakHoney.toFixed(1) + ' lb');
    }

    log('');
    log('===== peak-summer instantaneous rates at 40,000 workers =====');
    const P = BH.SIMULATION_PARAMS;
    for (const [label, eff, hMod, fMod, hab] of [
      ['default  ', 0.70, 1, 1, 50],
      ['best case', 1.25, 1.3, 1.3, 100],
    ]) {
      const foragers = Math.round(40000 * P.foragerRatio);
      let nectarIn = foragers * P.nectarPerForager * 1.3 * eff * hMod * fMod;
      if (hab > P.habitatBoostThreshold) nectarIn *= P.habitatBoostMult;
      const honeyOut = 40000 * P.honeyConsumePerWorker * 1.2;
      log('  ' + label + '  gross in ' + nectarIn.toFixed(2) + ' lb/day, consumed '
        + honeyOut.toFixed(2) + ' lb/day, NET ' + (nectarIn - honeyOut).toFixed(2) + ' lb/day');
    }
    log('  real reference     gross in 5.00-15.00 lb/day, consumed 0.50-1.00 lb/day, NET +4 to +14');

    writeFileSync(REPORT, OUT.join('\n'), 'utf8');
  });
});
