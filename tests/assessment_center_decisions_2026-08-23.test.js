// Aaron's decisions, 2026-08-23 — pins for the two removals.
//
//  1. Live Sync DROPPED (not built): it subscribed to a
//     .../sessions/{code}/studentProgress subcollection nothing has ever
//     written, so it connected and stayed empty. The durable path exists
//     without it (the host banks live-session roster results into probe
//     history as they arrive).
//  2. mathFluencyHistory RETIRED: the device-global array nothing wrote since
//     the math-probe rework. Both readers (Report Writer's math section, the
//     fluency panel's AlloSheet envelope) now take per-student math probes
//     from probe history via ONE host derivation, mathProbesFor().

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let anti;
let ac;
let rw;
let fluency;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  ac = readFileSync('student_analytics_module.js', 'utf8');
  rw = readFileSync('report_writer_module.js', 'utf8');
  fluency = readFileSync('fluency_module.js', 'utf8');
});

describe('Live Sync is gone', () => {
  it('no states, no subscription, no unsubscribe handle', () => {
    for (const gone of ['showLiveSyncInput', 'isLiveListening', 'liveProgressData', 'liveSyncCode', '_progressUnsub']) {
      expect(ac, gone + ' must not survive').not.toContain(gone);
    }
    // The only studentProgress mentions left are the different
    // studentProgressSummary identifier and the removal note itself.
    expect(ac.match(/studentProgress(?!Summary)/g)).toHaveLength(1);
    expect(ac).toContain('Live Sync removed 2026-08-23');
  });

  it('the toolbar survives the splice: export, safety toggle and clear are intact', () => {
    expect(ac).toContain("t('class_analytics.export_csv')");
    expect(ac).toContain("t('common.toggle_safety_flags')");
    expect(ac).toContain('dashboard_clear_btn');
  });

  it('the isLive guards stay as cheap defense', () => {
    expect(ac).toContain('.filter(s => s && !s.isLive)');
  });
});

describe('mathFluencyHistory is retired', () => {
  it('the device-global state is gone from the host', () => {
    expect(anti).not.toContain('const [mathFluencyHistory, setMathFluencyHistory]');
    expect(anti).not.toContain('setMathFluencyHistory(');
  });

  it('ONE derivation feeds both readers', () => {
    expect(anti).toContain('const mathProbesFor = (name) =>');
    expect(anti.match(/mathProbesFor\(studentNickname\)/g)).toHaveLength(2);
  });

  it('the derivation filters to math probe records and never throws on unknowns', () => {
    const at = anti.indexOf('const mathProbesFor = (name) =>');
    expect(at).toBeGreaterThan(-1);
    const end = anti.indexOf(': [];', at);
    const fnSrc = anti.slice(at, end + ': [];'.length);
    // eslint-disable-next-line no-new-func
    const load = (probeHistory) => new Function('probeHistory', fnSrc + ' return mathProbesFor;')(probeHistory);
    const probes = load({
      Falcon: [
        { activity: 'math_dcpm', dcpm: 22 },
        { activity: 'orf', wcpm: 61 },
        { activity: 'math', itemsPerMin: 18 },
        null,
      ],
    });
    expect(probes('Falcon').map(r => r.activity)).toEqual(['math_dcpm', 'math']);
    expect(probes('Nobody')).toEqual([]);
    expect(load(null)('Falcon')).toEqual([]);
    expect(probes('')).toEqual([]);
  });

  it('Report Writer reads the student-scoped key and renders DCPM', () => {
    expect(rw).not.toContain('longitudinalData.mathFluencyHistory ||');
    expect(rw).toContain('const mathHist = longitudinalData.mathProbeHistory || [];');
    expect(rw).toContain('digits correct per minute');
    expect(rw).toContain('Average DCPM (last ');
    // The import-button count reads the new key too.
    expect(rw).toContain('longitudinalData.mathProbeHistory?.length');
  });

  it("the fluency AlloSheet envelope keeps its key name, and its mapper reads the new shape's dcpm", () => {
    expect(anti).toContain('mathFluencyHistory: mathProbesFor(studentNickname),');
    expect(fluency).toContain("fluencyAlloPick(data, ['dcpm'], null)");
  });
});
