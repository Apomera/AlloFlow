import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * "Send to Print Lab" told the student it was opening Print Lab and then, on
 * some hosts, did nothing at all.
 *
 * ctx.setStemLabTool exists everywhere, but stem_lab_module.js substitutes a
 * silent no-op — `: function() {}` — when the surrounding app supplied no real
 * setter. `typeof ctx.setStemLabTool === 'function'` is therefore not evidence
 * that the switch happened, so the tool announced success, left the handoff
 * payload sitting on window, and the student saw nothing change. Reproduced in
 * a browser on 2026-09-21 against a no-op host.
 *
 * Print Lab deletes the payload as it mounts, so the tool now checks whether the
 * object it wrote is still there and, if so, clears it and says what actually
 * happened. The same shape was fixed in Geometry World earlier.
 */
const SOURCE = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const LOADER = path.join(process.cwd(), 'stem_lab', 'stem_lab_module.js');

describe('Art Studio Print Lab handoff', () => {
  const source = fs.readFileSync(SOURCE, 'utf8');

  it('the no-op substitution this guards against still exists in the loader', () => {
    // If the loader ever stops substituting a no-op, this guard can be removed —
    // but until then, a passing typeof check proves nothing.
    const loader = fs.readFileSync(LOADER, 'utf8');
    expect(loader, 'loader no longer substitutes a silent no-op; revisit the guard')
      .toMatch(/_safeSetStemLabTool[\s\S]{0,400}: function\(\) \{\}/);
  });

  it('names the handoff payload so the outcome can be checked', () => {
    expect(source, 'the payload must be a named object, not an anonymous assignment')
      .toContain('var handoffPayload = {');
    expect(source).toContain('window.__alloPrintLabPendingHandoff = handoffPayload;');
  });

  it('verifies the switch and tells the student when it did not happen', () => {
    expect(source, 'an unconsumed payload means nothing opened')
      .toContain('if (window.__alloPrintLabPendingHandoff !== handoffPayload) return;');
    // The stranded payload must be cleared, not left to confuse the next handoff.
    expect(source).toContain("delete window.__alloPrintLabPendingHandoff;");
    // And the student has to be told, in both channels.
    expect(source).toContain('stem.artstudio.print_lab_did_not_open');
    expect(source).toContain('stem.artstudio.sr_print_lab_did_not_open');
  });
});
