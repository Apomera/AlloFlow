/**
 * Every Moon Mission control that overrides its name with aria-label must still
 * contain what it shows (WCAG 2.5.3, label in name): a voice-control user says the
 * words on the button. Every phase's main action button failed this ("Proceed to
 * Orbit" was named "Proceed to Earth orbit phase after successful launch"), as did
 * the header toggles ("Sound on" was "Mute all mission sound").
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';
const norm = (s) => String(s || '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase();

// Each phase, plus the states that swap in other controls.
const STATES = [];
for (let phase = 0; phase <= 10; phase++) {
  STATES.push({ missionPhase: phase });
  STATES.push({ missionPhase: phase, missionStartTime: 1000, animPaused: true, soundOff: true });
}
STATES.push({ missionPhase: 5, descentStarted: true });
STATES.push({ missionPhase: 5, descentStarted: true, landingResult: { crashed: false, score: 80, grade: 'B', vVel: 1.5, hVel: 1, fuel: 20 } });
STATES.push({ missionPhase: 6, evaStarted: true });
// An off-window TLI bills a mid-course correction; an event opens its own choices.
STATES.push({ missionPhase: 3, tliAccuracy: { onTime: false, offByDeg: 7 } });
STATES.push({ missionPhase: 3, activeEvent: { id: 'gate', title: 'Gate event', emoji: '!', scenario: 'x', stemConcepts: ['c'],
  options: [{ label: 'Rotate the spacecraft', icon: '*', effects: {}, quality: 'optimal', xp: 5, scienceReward: 'r' }] } });
STATES.push({ missionPhase: 3, trueScale: true });
STATES.push({ missionPhase: 4, moonLabels: true });

beforeEach(() => resetStemLab());

describe('Moon Mission label in name', () => {
  it('no control is named something other than what it shows', () => {
    const bad = [];
    let checked = 0, labelled = 0;
    for (const st of STATES) {
      loadTool(FILE, ID);
      const root = document.createElement('div');
      root.innerHTML = renderTool(ID, { moonMission: Object.assign({ lunarSamples: [] }, st) });
      root.querySelectorAll('button, [role="button"], [role="radio"], [role="tab"], a[href]').forEach((el) => {
        const shown = norm(el.textContent);
        if (!shown) return;   // icon-only: the aria-label is the only name there is
        checked++;
        const label = el.getAttribute('aria-label');
        if (label == null) return;
        labelled++;
        if (!norm(label).includes(shown)) bad.push('phase ' + st.missionPhase + ': shows "' + el.textContent.trim().slice(0, 50) + '", named "' + label.slice(0, 80) + '"');
      });
    }
    expect(checked, 'controls with visible text').toBeGreaterThan(60);
    expect([...new Set(bad)]).toEqual([]);
  });
});
