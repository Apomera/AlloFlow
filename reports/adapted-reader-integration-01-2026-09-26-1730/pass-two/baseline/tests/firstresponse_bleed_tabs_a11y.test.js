import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_firstresponse.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_firstresponse.js');
const FILE = 'stem_lab/stem_tool_firstresponse.js';
const ID = 'firstResponse';

function bleed(extra = {}) {
  return renderTool(ID, { firstResponse: Object.assign({ view: 'bleed', consentAccepted: true }, extra) });
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});


describe('First Response Stop the Bleed tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives Stop the Bleed tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.firstresponse.stop_the_bleed_sections'");
    expect(source).toContain("var BLEED_TAB_IDS = ['overview', 'practice', 'detail', 'tourniquet'];");
    expect(source).toContain("id: 'firstresponse-bleed-tab-' + id");
    expect(source).toContain("'aria-controls': 'firstresponse-bleed-panel-' + id");
    expect(source).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { bleedTabKeyDown(e, BLEED_TAB_IDS.indexOf(id)); }');
    expect(source).toContain("key !== 'ArrowRight' && key !== 'ArrowDown'");
    expect(source).toContain("key === 'ArrowLeft' || key === 'ArrowUp'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
  });

  it('links the active Stop the Bleed section to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("id: 'firstresponse-bleed-panel-' + bleedView");
    expect(source).toContain("'aria-labelledby': 'firstresponse-bleed-tab-' + bleedView");
    expect(source).toContain('tabIndex: 0');
  });
  it('renders the interactive bleeding-control practice floor', () => {
    const html = bleed({ bleedView: 'practice' });
    expect(html).toContain('Interactive bleeding-control practice');
    expect(html).toContain('Workshop — deep thigh wound');
    expect(html).toContain('Bike crash — deep groin wound');
    expect(html).toContain('Start bleeding-control scenario');
  });

  it('pins the pressure, packing, and tourniquet interaction sequence', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('function beginBleedPressure');
    expect(source).toContain('function endBleedPressure');
    expect(source).toContain('held < 2500');
    expect(source).toContain("p.phase = 'tourniquetPlacement'");
    expect(source).toContain("p.phase = 'packing'");
    expect(source).toContain("p.phase = 'packPressure'");
    expect(source).toContain('Tighten until the bleeding stops');
    expect(source).toContain('Note the application time and leave the tourniquet in place');
    expect(source).toContain('This screen cannot assess real force, packing depth, or tourniquet tightness');
  });

  it('does not teach a five-minute delay or unreliable improvised-tourniquet shortcut', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).not.toContain('Tourniquet only if pressure cannot stop the bleed within ~5 minutes');
    expect(source).not.toContain('Stay on it for at least 5 minutes');
    expect(source).not.toContain('a belt + a stick to twist works');
    expect(source).toContain('Use a manufactured tourniquet and follow its instructions');
    expect(source).toContain('The treatment choice depends on wound location and severity');
  });

});
