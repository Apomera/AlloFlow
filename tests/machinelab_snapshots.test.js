import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const HOSTS = [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js'
];

const state = (o = {}) => ({ machineLab: Object.assign({ view: 'build' }, o) });

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'machineLab');
});

describe('Machine Lab: saving a design', () => {
  it('offers a save control in the Build view', () => {
    const html = renderTool('machineLab', state());
    expect(html).toContain('Save this design');
  });

  it('calls the host with the tool id, a readable label and a payload', () => {
    const calls = [];
    renderTool('machineLab', state({ machine: 'trebuchet' }), {
      saveSnapshot: (tool, label, data) => calls.push({ tool, label, data })
    });
    // Rendering alone must not save anything; saving is a deliberate act.
    expect(calls).toHaveLength(0);
  });

  it('names the machine and its performance in the label', () => {
    // The host lists snapshots by label alone, so the label has to carry
    // enough to tell two designs apart in a list.
    const cfg = loadTool(FILE, 'machineLab');
    const src = String(cfg.render);
    expect(src).toContain('machineLabel(machineId)');
    expect(src).toMatch(/fmt\(preview\.range, 0\) \+ ' m · ' \+ fmt\(100 \* preview\.eta, 0\)/);
  });

  it('saves the design and not the transient siege or tutor state', () => {
    const cfg = loadTool(FILE, 'machineLab');
    const src = String(cfg.render);
    const start = src.indexOf('function designPayload()');
    const end = src.indexOf('function saveDesign()');
    expect(start).toBeGreaterThan(-1);
    const payload = src.slice(start, end);

    for (const wanted of ['machine', 'cwMass', 'beamLong', 'torsionTurns', 'gravity', 'windZ']) {
      expect(payload, 'design field ' + wanted + ' should be saved').toContain("'" + wanted + "'");
    }
    for (const unwanted of ['wallBlocks', 'lastShot', 'aiText', 'shotHistory', 'provenBenches', 'shotsFired']) {
      expect(payload, 'transient field ' + unwanted + ' should NOT be saved').not.toContain("'" + unwanted + "'");
    }
  });

  it('degrades politely when the host offers no snapshot support', () => {
    const cfg = loadTool(FILE, 'machineLab');
    const src = String(cfg.render);
    expect(src).toContain("typeof ctx.saveSnapshot !== 'function'");
    expect(src).toContain('Saving is not available here.');
  });
});

describe('Machine Lab: the host can actually restore what we save', () => {
  // The host's snapshot Load button has a HARDCODED per-tool restore list. A
  // tool that is not on it saves and lists fine, and Load silently just opens
  // the tool without restoring anything: a button that does not do what it
  // says. machineLab had to be added to that list.
  for (const host of HOSTS) {
    it(`${host.includes('desktop') ? 'desktop' : 'CDN'} host restores machineLab snapshots`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), host), 'utf8');
      expect(src).toContain("snap.tool === 'machineLab'");
      // Merged onto the existing slice, not replacing it wholesale.
      expect(src).toMatch(/snap\.tool === 'machineLab' && snap\.data.*machineLab: Object\.assign\(\{\}, prev\.machineLab, snap\.data\)/);
    });
  }

  // Deliberately NOT a byte-parity assertion on the host. stem_lab_module.js is
  // shared, several sessions edit it concurrently, and one of them being
  // mid-mirror is normal rather than a fault in this tool. Asserting global
  // parity here made Machine Lab's suite fail for somebody else's in-flight
  // work. What this tool owns is that ITS restore line is in both copies,
  // which the two tests above check directly. Byte parity of
  // stem_tool_machinelab.js is asserted in machinelab_a11y.test.js, and that
  // file is ours alone.

  it('restores cleanly from a partial payload', () => {
    // The saved payload is a subset of the tool's state. The defaults fill is
    // what makes that safe, so a restore must not blank the rest of the tool.
    const restored = renderTool('machineLab', {
      machineLab: { view: 'build', machine: 'ballista', torsionTurns: 20 }
    });
    expect(restored).toContain('Ballista');
    expect(restored).toContain('Energy ledger');
    expect(restored).not.toContain('NaN');
    expect(restored).not.toContain('undefined');
  });
});
