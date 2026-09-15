import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const renderer = fs.readFileSync('view_renderers_source.jsx', 'utf8');
const generator = fs.readFileSync('generate_dispatcher_source.jsx', 'utf8');
// The organizer connection persistence moved out of the monolith into the extracted
// host handlers (2026-09; the pins below used to read AlloFlowANTI.txt + the generated
// App.jsx and went red when the code moved, not when it broke). Pin the SOURCE that owns
// it now; the built module is minified, so a text pin there would be vacuous.
const hostHandlers = fs.readFileSync('host_handlers_source.jsx', 'utf8');

const normalizerStart = renderer.indexOf('const VISUAL_ORGANIZER_SECTION_SPECS');
const normalizerEnd = renderer.indexOf('const FlowTopologyBoard', normalizerStart);
const normalizerSource = renderer.slice(normalizerStart, normalizerEnd);
const normalizeVisualOrganizerData = Function(normalizerSource + '\nreturn normalizeVisualOrganizerData;')();

describe('visual organizer schema repair and flow topology', () => {
  // 2026-09-15: a {text: '…'} item reached `<li>{item}</li>` in the cause-and-effect renderer and
  // React throws on an object child, taking the organizer down through the error boundary.
  it('flattens object-shaped branch items to their text and drops text-less ones', () => {
    const out = normalizeVisualOrganizerData({
      main: 'Water cycle',
      structureType: 'Cause and Effect',
      branches: [
        { title: 'Causes', items: ['Sun heats the ocean', { text: 'Warm air rises' }, { label: 'Vapour cools' }, { weight: 3 }, 42, null] },
        { title: 'Effects', items: [{ text: '  ' }, 'Clouds form'] },
      ],
    }, 'Cause and Effect');
    expect(out.branches[0].items).toEqual(['Sun heats the ocean', 'Warm air rises', 'Vapour cools', '42']);
    expect(out.branches[1].items).toEqual(['Clouds form']);
    expect(out.branches.every((b) => b.items.every((item) => typeof item === 'string'))).toBe(true);
    expect(out.schemaValidation.repairs).toContain('branch-0-item-text');
    expect(out.schemaValidation.repairs).toContain('branch-1-item-text');
  });
  it('leaves all-string items untouched and records no item repair', () => {
    const out = normalizeVisualOrganizerData({ main: 'M', structureType: 'T-Chart', branches: [{ title: 'A', items: ['x', 'y'] }, { title: 'B', items: ['z'] }] }, 'T-Chart');
    expect(out.branches.map((b) => b.items)).toEqual([['x', 'y'], ['z']]);
    expect(out.schemaValidation.repairs.filter((r) => /item-text/.test(r))).toEqual([]);
  });

  it('repairs legacy flow destinations into labeled edge objects and drops unsafe targets', () => {
    const repaired = normalizeVisualOrganizerData({
      main: 'Review',
      structureType: 'Flow Chart',
      branches: [
        { title: 'Check', items: ['Inspect'], connectsTo: [1, 2, 2, 0, 99] },
        { title: 'Yes path', items: ['Continue'], connectsTo: [2] },
        { title: 'Done', items: [] },
      ],
    });

    expect(repaired.branches[0].connections).toEqual([
      { target: 1, label: '' },
      { target: 2, label: '' },
    ]);
    expect(repaired.branches[0].connectsTo).toEqual([1, 2]);
    expect(repaired.schemaValidation.repaired).toBe(true);
    expect(repaired.schemaValidation.repairs).toContain('branch-0-invalid-connection');
  });

  it('preserves route labels and repairs omitted linear edges', () => {
    const labeled = normalizeVisualOrganizerData({
      structureType: 'Flow Chart',
      branches: [
        { title: 'Question', items: [], connections: [{ target: 1, label: 'Yes' }] },
        { title: 'Finish', items: [] },
      ],
    });
    expect(labeled.branches[0].connections[0]).toEqual({ target: 1, label: 'Yes' });

    const legacyLinear = normalizeVisualOrganizerData({
      structureType: 'Flow Chart',
      branches: [
        { title: 'One', items: [] },
        { title: 'Two', items: [] },
      ],
    });
    expect(legacyLinear.branches[0].connections).toEqual([{ target: 1, label: '' }]);
  });

  it('assigns machine-readable roles and reports unsafe fixed-layout counts', () => {
    const cer = normalizeVisualOrganizerData({
      structureType: 'Claim-Evidence-Reasoning',
      branches: [
        { title: 'A', items: [] },
        { title: 'B', items: [] },
        { title: 'C', items: [] },
      ],
    });
    expect(cer.branches.map(branch => branch.sectionRole)).toEqual(['claim', 'evidence', 'reasoning']);
    expect(cer.schemaValidation.valid).toBe(true);

    const brokenKwl = normalizeVisualOrganizerData({
      structureType: 'KWL Chart',
      branches: [{ title: 'Know', items: [] }],
    });
    expect(brokenKwl.schemaValidation.valid).toBe(false);
    expect(brokenKwl.schemaValidation.issues[0]).toEqual({ code: 'branch-count', expected: 3, actual: 1 });
  });

  it('uses rank-based lanes, measured SVG edges, and separate loopback routing', () => {
    expect(renderer).toContain('const FlowTopologyBoard');
    expect(renderer).toContain('const ranks = Array(nodeCount).fill(null)');
    expect(renderer).toContain('new window.ResizeObserver(scheduleMeasure)');
    expect(renderer).toContain('const isBackEdge = targetRank <= sourceRank');
    expect(renderer).toContain("strokeDasharray={edge.isBackEdge ? '7 5' : undefined}");
    expect(renderer).toContain("markerEnd={'url(#' + markerId + ')'}");
  });

  it('provides keyboard-operable connection selection and editable route labels', () => {
    expect(renderer).toContain("type=\"checkbox\"");
    expect(renderer).toContain("handleOutlineChange(sourceIndex, 'connections', next)");
    expect(renderer).toContain("t('outline.path_label')");
    expect(renderer).toContain('maxLength={40}');
    expect(renderer).toContain('<ul className="sr-only">');
  });

  it('normalizes both initial and AI-repaired generation output', () => {
    expect(generator).toContain('const _normalizeGeneratedOrganizer');
    expect(generator).toContain('content = _normalizeGeneratedOrganizer(usesLocalTextBackend');
    expect(generator).toContain('content = _normalizeGeneratedOrganizer(JSON.parse(cleanJson(repairResult)))');
    expect(generator).toContain("'connections':[{'target':1,'label':'Yes'}");
    expect(generator).toContain('optional concise route labels');
  });

  it('persists sanitized connection objects and backward-compatible target arrays', () => {
    expect(hostHandlers).toContain("field === 'connections'");
    expect(hostHandlers).toContain('branch.connections = newConnections;');
    expect(hostHandlers).toContain('branch.connectsTo = newConnections.map(connection => connection.target);');
    expect(hostHandlers).toContain('target === branchIndex');
  });
});
