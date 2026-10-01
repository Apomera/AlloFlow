// Moon Mission — the trans-lunar injection window.
//
// Pins three review findings:
//   • the burn window sat on the Moon-facing side of Earth under a banner saying
//     the velocity pointed at where the Moon would be. TLI fires on the far side:
//     the burn raises the far end of the orbit, and the craft coasts half an orbit
//     out to meet the Moon;
//   • the live region held the changing degrees and seconds, so it re-announced
//     about five times a second;
//   • the debrief said EARLY for every off-window burn, including late ones.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_moonmission.js';
function render(state) {
  loadTool(FILE, 'moonMission');
  return renderTool('moonMission', { moonMission: state });
}
const liveText = (html) => {
  const m = html.match(/<p[^>]*data-moonmission-tli-state="[^"]*"[^>]*>([\s\S]*?)<\/p>/);
  return m ? m[1] : null;
};

beforeEach(() => resetStemLab());

describe('TLI burn window', () => {
  it('burns on the far side of Earth from the Moon', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    expect(src).toMatch(/var tliTargetAng = Math\.PI;/);
    const go = render({ missionPhase: 2, tliWindow: { state: 'go', offByDeg: 3, side: 'early', secsToGo: 0 } });
    expect(liveText(go)).toMatch(/far side of Earth/);
    expect(go).not.toMatch(/velocity vector is pointing at where the Moon will be/);
  });

  it('the live region names the state; the changing numbers sit outside it', () => {
    const html = render({ missionPhase: 2, tliWindow: { state: 'aligning', offByDeg: 40, side: 'early', secsToGo: 12 } });
    const live = liveText(html);
    expect(live, 'no live TLI status').not.toBeNull();
    expect(live).not.toMatch(/\d/);
    expect(html).toMatch(/data-moonmission-tli-detail="true"[^>]*>About 40° before the burn point\. Window in about 12 s\./);
  });

  it('the debrief says LATE for a late burn and EARLY for an early one', () => {
    const late = render({ missionPhase: 10, tliAccuracy: { onTime: false, offByDeg: 36, side: 'late' } });
    expect(late).toContain('36° LATE');
    const early = render({ missionPhase: 10, tliAccuracy: { onTime: false, offByDeg: 22, side: 'early' } });
    expect(early).toContain('22° EARLY');
    const legacy = render({ missionPhase: 10, tliAccuracy: { onTime: false, offByDeg: 22 } });
    expect(legacy).toContain('22° EARLY');
  });
});
