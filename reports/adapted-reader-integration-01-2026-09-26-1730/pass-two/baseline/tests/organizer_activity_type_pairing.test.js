// Visual-organizer activity: the TYPE mismatch must be unreachable.
//
// The launch button is DERIVED from the organizer's structureType, so a concept
// map can only ever offer "Sort Onto Branches". The user-visible "This activity
// does not match the open visual organizer" came from the two sides being
// computed off DIFFERENT views of the resource: the button from
// normalizeVisualOrganizerData(...), the readiness contract from the raw
// generatedContent. When normalisation supplied or repaired structureType the
// pair drifted and the app contradicted a button it had derived itself.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const renderers = readFileSync(resolve(ROOT, 'view_renderers_source.jsx'), 'utf8');
const anti = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const sidebar = readFileSync(resolve(ROOT, 'view_sidebar_panels_source.jsx'), 'utf8');

const sliceBetween = (text, startNeedle, endNeedle) => {
  const a = text.indexOf(startNeedle);
  expect(a, 'missing anchor: ' + startNeedle).toBeGreaterThan(-1);
  const b = text.indexOf(endNeedle, a + startNeedle.length);
  expect(b, 'missing anchor: ' + endNeedle).toBeGreaterThan(a);
  return text.slice(a, b);
};

// Map keys are unquoted when they are valid identifiers (Fishbone: 'fishbone').
const hasKey = (mapText, structure) => {
  const esc = structure.replace(/[-/\^$*+?.()|[\]{}]/g, '\$&');
  return new RegExp("(?:'" + esc + "'|\b" + esc + "\b)\s*:").test(mapText);
};

describe('visual-organizer activity/readiness pairing', () => {
  it('readiness is judged against the resource that was rendered, not the raw one', () => {
    expect(renderers).toMatch(/const _liveReadinessFor = \(type, resourceOverride\) =>/);
    expect(renderers).toMatch(/getLiveOrganizerReadiness\(type, resourceOverride \|\| generatedContent\)/);
    expect(renderers).toMatch(/const organizerResource = \{ \.\.\.generatedContent, data: organizerData \};/);
  });

  it('every readiness call in the outline renderer goes through the normalised resource', () => {
    const body = sliceBetween(renderers, 'const renderOutlineContentCore = (deps)', '\nconst ConceptSpace3DView');
    const bare = body.match(/_liveReadinessFor\(/g) || [];
    expect(bare.length).toBe(1); // only the wrapper's own call
    expect(body).toMatch(/const _readinessFor = \(activityType\) => _liveReadinessFor\(activityType, organizerResource\)/);
    expect(body).toMatch(/const readiness = _readinessFor\(activityType\);/);
    for (const t of ['palacerecall', 'strandchallenge3d', 'conceptrecall3d']) {
      expect(body).toContain("_readinessFor('" + t + "')");
    }
  });

  it('the activity type is derived from the organizer, so the wrong button cannot be offered', () => {
    const map = sliceBetween(renderers, 'const activityTypeByStructure = {', '};');
    expect(map).toMatch(/'Key Concept Map': 'conceptmap'/);
    expect(map).toMatch(/'Structured Outline': 'outline'/);
    expect(map).not.toMatch(/'Key Concept Map': 'outline'/);
  });

  it('every derived activity type is accepted by its own readiness contract', () => {
    const map = sliceBetween(renderers, 'const activityTypeByStructure = {', '};');
    const table = sliceBetween(anti, 'const LIVE_ORGANIZER_STRUCTURE_TYPES = Object.freeze({', '});');
    const pairs = [...map.matchAll(/(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))\s*:\s*'([a-z0-9]+)'/g)]
      .map(m => [(m[1] || m[2]).trim(), m[3]]);
    expect(pairs.length).toBeGreaterThanOrEqual(11);
    for (const [structure, activity] of pairs) {
      // Build the pattern from a literal regex so no string-escaping layer can
      // mangle it; only the activity name varies.
      const rowRe = new RegExp(activity + String.raw`: new Set\(\[([^\]]*)\]\)`);
      const row = table.match(rowRe);
      expect(row, 'no readiness row for activity ' + activity).toBeTruthy();
      expect(row[1], activity + ' does not accept "' + structure + '"').toContain("'" + structure + "'");
    }
  });

  it('every structure type the picker offers is accounted for', () => {
    const picker = sliceBetween(sidebar, '<option value="Venn Diagram">', '</select>');
    const offered = [...picker.matchAll(/value="([^"]+)"/g)].map(m => m[1]);
    expect(offered.length).toBeGreaterThanOrEqual(14);
    const map = sliceBetween(renderers, 'const activityTypeByStructure = {', '};');
    const table = sliceBetween(anti, 'const LIVE_ORGANIZER_STRUCTURE_TYPES = Object.freeze({', '});');
    // Deliberate: no interactive mode today. If one gains an activity, update
    // this list so the omission stays a decision rather than a silent drift.
    const NO_ACTIVITY = new Set();
    // These launch from their own dedicated surfaces, not the shared button.
    const OWN_SURFACE = new Set(['Venn Diagram', '3D Concept Space', 'Memory Palace', 'KWL Chart']);
    for (const structure of offered) {
      if (NO_ACTIVITY.has(structure)) {
        expect(hasKey(map, structure), structure + ' unexpectedly gained a launch mapping').toBe(false);
        continue;
      }
      if (OWN_SURFACE.has(structure)) {
        expect(table, structure + ' should still have a readiness contract').toContain("'" + structure + "'");
        continue;
      }
      expect(hasKey(map, structure), structure + ' has no launch mapping').toBe(true);
    }
  });
});
