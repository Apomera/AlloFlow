import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function relativeLuminance(hex) {
  const value = hex.replace('#', '');
  const rgb = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const linear = rgb.map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4)
  ));
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrast(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function source(file) {
  return readFileSync(resolve(process.cwd(), file), 'utf8');
}

describe('Free Forms contrast regressions', () => {
  it('uses AA text colors on its fixed dark panels', () => {
    expect(contrast('#94a3b8', '#1e293b')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#cbd5e1', '#1e293b')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#64748b', '#1e293b')).toBeLessThan(4.5);

    const file = source('stem_lab/stem_tool_freeforms.js');
    expect(file).toContain("#allo-free-forms .ff-sidebar .text-slate-500 { color: #94a3b8 !important; }");
  });

  it('keeps control boundaries at 3:1 and button text at 4.5:1', () => {
    expect(contrast('#64748b', '#1e293b')).toBeGreaterThanOrEqual(3);
    expect(contrast('#ffffff', '#6d28d9')).toBeGreaterThanOrEqual(4.5);

    const file = source('stem_lab/stem_tool_freeforms.js');
    expect(file).toContain(':is(.border-slate-600, .border-slate-700) { border-color: #64748b !important; }');
    expect(file).toContain('hover:bg-violet-700');
    expect(file).not.toContain('hover:bg-violet-500');
  });
});

describe('Shared STEM 3D panel contrast regressions', () => {
  it('does not use palette colors as small text on the dark panel', () => {
    const file = source('concept_graph_3d_module.js');
    expect(file).toContain("color:#f1f5f9;border-left:4px solid ' + n.color");
    expect(file).toContain("border:2px solid ' + laneColor + ';color:#e2e8f0;");
    expect(file).not.toContain("background:' + laneColor + ';color:#0b1020");
  });

  it('raises the 10px editing hint above AA', () => {
    expect(contrast('#94a3b8', '#020617')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#64748b', '#020617')).toBeLessThan(4.5);

    const file = source('concept_graph_3d_module.js');
    expect(file).toContain('margin-top:6px;color:#94a3b8;font-size:10px');
  });
});

describe('Other STEM dark-panel helper text', () => {
  it.each([
    'stem_lab/stem_tool_evolab.js',
    'stem_lab/stem_tool_spacecolony.js',
  ])('%s uses a readable helper color', (fileName) => {
    const file = source(fileName);
    expect(file).toContain("background: 'rgba(15,28,47,0.5)'");
    expect(file).toContain("fontSize: 10, fontStyle: 'italic', color: '#cbd5e1'");
    expect(contrast('#cbd5e1', '#0f1c2f')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Broader STEM contrast sweep', () => {
  it.each([
    ['Probability decrease', '#991b1b', '#fecaca'],
    ['Probability increase', '#14532d', '#bbf7d0'],
    ['Road Ready amber actions', '#451a03', '#f59e0b'],
    ['Light helper notes', '#475569', '#f1f5f9'],
    ['Space Colony progress', '#94a3b8', '#1e293b'],
    ['Bird Lab empty state', '#475569', '#f8fafc'],
    ['Dissection procedure step', '#3f5f5c', '#dfeae9'],
  ])('%s remains at or above 4.5:1', (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('pins the accessible Probability Lab count controls', () => {
    const file = source('stem_lab/stem_tool_probability.js');
    expect(file).toContain("background: '#fecaca', color: '#991b1b'");
    expect(file).toContain("background: '#bbf7d0', color: '#14532d'");
  });

  it('pins Road Ready action and helper colors', () => {
    const file = source('stem_lab/stem_tool_roadready.js');
    expect(file).toContain("background: '#f59e0b', color: '#451a03'");
    expect(file).toContain("background: '#f1f5f9', borderRadius: 4, fontSize: 10, fontStyle: 'italic', color: '#475569'");
  });

  it('pins readable secondary text in the remaining tools', () => {
    expect(source('stem_lab/stem_tool_typingpractice.js')).toContain(
      "background: '#f1f5f9', borderRadius: 4, fontSize: 10, fontStyle: 'italic', color: '#475569'",
    );
    expect(source('stem_lab/stem_tool_spacecolony.js')).toContain(
      "background: '#1e293b', color: '#94a3b8'",
    );
    expect(source('stem_lab/stem_tool_birdlab.js')).toContain(
      'color: #475569; font-style: italic; background: #f8fafc',
    );
    expect(source('stem_lab/stem_tool_dissection.js')).toContain(
      'background: #dfeae9; color: #3f5f5c; font-size: .61rem',
    );
  });
});

describe('Gradient and exported-card contrast sweep', () => {
  it.each([
    ['export page', '#f8fafc', '#0f172a'],
    ['export card', '#1a1a1a', '#fde68a'],
    ['export empty state', '#475569', '#fde68a'],
    ['Play Lab field green', '#052e16', '#10b981'],
    ['Play Lab field dark green', '#052e16', '#16a34a'],
    ['Water Cycle cyan stop', '#ffffff', '#0e7490'],
    ['Water Cycle blue stop', '#ffffff', '#1d4ed8'],
    ['Stewardship first stop', '#ffffff', '#15803d'],
    ['Stewardship second stop', '#ffffff', '#166534'],
    ['AlphaFold teal stop', '#ffffff', '#0f766e'],
    ['AlphaFold blue stop', '#ffffff', '#0369a1'],
    ['Arch Studio amber stop', '#ffffff', '#b45309'],
    ['Arch Studio pink stop', '#ffffff', '#be185d'],
    ['Arch Studio red stop', '#ffffff', '#b91c1c'],
    ['Climate XP green stop', '#052e16', '#16a34a'],
    ['Flight Sim cyan stop', '#ffffff', '#0e7490'],
    ['Flight Sim green stop', '#ffffff', '#047857'],
    ['Geometry purple stop', '#ffffff', '#7c3aed'],
    ['Nutrition teal stop', '#ffffff', '#0f766e'],
    ['Space Colony achievement', '#fecdd3', '#9f1239'],
    ['Space Colony challenge', '#fef3c7', '#92400e'],
    ['Space Station sunlight', '#fff7ed', '#9a3412'],
  ])('%s remains at or above 4.5:1', (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['stem_lab/stem_tool_watercycle.js', 'linear-gradient(135deg,#0e7490,#1d4ed8)'],
    ['stem_lab/stem_tool_stewardship.js', 'linear-gradient(135deg,#15803d,#166534)'],
    ['stem_lab/stem_tool_alphafold.js', 'linear-gradient(135deg,#0f766e,#0369a1)'],
    ['stem_lab/stem_tool_swimlab.js', 'linear-gradient(135deg,#0369a1,#075985)'],
    ['stem_lab/stem_tool_nutritionlab.js', 'linear-gradient(135deg, #047857, #0f766e)'],
    ['stem_lab/stem_tool_spacestation.js', 'linear-gradient(90deg,#7c2d12,#9a3412)'],
    ['stem_lab/stem_tool_learning_lab.js', 'linear-gradient(145deg, #047857, #065f46)'],
  ])('%s pins its accessible gradient', (fileName, gradient) => {
    expect(source(fileName)).toContain(gradient);
  });

  it.each([
    'stem_lab/stem_tool_playlab.js',
    'stem_lab/stem_tool_throwlab.js',
  ])('%s separates dark page and light card text colors', (fileName) => {
    const fileSource = source(fileName);
    expect(fileSource).toContain('background:#0f172a;color:#f8fafc');
    expect(fileSource).toContain('background:linear-gradient(135deg,#fef3c7,#fde68a);color:#1a1a1a');
    expect(fileSource).toContain('.badge-empty{color:#475569');
  });

  it('pins accessible action treatments in inline-style tools', () => {
    expect(source('stem_lab/stem_tool_archstudio.js')).toContain('linear-gradient(135deg,#be185d,#9d174d)');
    expect(source('stem_lab/stem_tool_climateExplorer.js')).toContain("fontWeight: 900, color: '#052e16'");
    expect(source('stem_lab/stem_tool_flightsim.js')).toContain('linear-gradient(135deg, #047857, #065f46)');
    expect(source('stem_lab/stem_tool_microbiology.js')).toContain('linear-gradient(135deg, #047857 0%, #065f46 100%)');
    expect(source('stem_lab/stem_tool_solarsystem.js')).toContain('linear-gradient(135deg, #15803d, #166534)');
    expect(source('stem_lab/stem_tool_geometryworld.js')).toContain('linear-gradient(135deg, #7c3aed, #4f46e5)');
    expect(source('stem_lab/stem_tool_roadready.js')).toContain('linear-gradient(135deg, #7c3aed, #6d28d9)');
    expect(source('stem_lab/stem_tool_astronomy.js')).toContain('linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)');
    expect(source('stem_lab/stem_tool_spacecolony.js')).toContain("color: '#fecdd3', border: '1px solid #f43f5e'");
  });
});


describe('Small STEM control contrast sweep', () => {
  it.each([
    ['amber control', '#451a03', '#f59e0b'],
    ['green control', '#ffffff', '#15803d'],
    ['bright green control', '#052e16', '#22c55e'],
    ['emerald control', '#052e16', '#10b981'],
    ['cyan control', '#082f49', '#0ea5e9'],
    ['outlined cyan control', '#075985', '#ffffff'],
    ['rose control', '#ffffff', '#be123c'],
    ['blue control', '#ffffff', '#1d4ed8'],
    ['red control', '#ffffff', '#b91c1c'],
    ['dark emerald badge', '#ffffff', '#047857'],
    ['indigo control', '#ffffff', '#4f46e5'],
  ])('%s remains at or above 4.5:1', (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['stem_lab/stem_tool_probability.js', "background: '#f59e0b', color: '#451a03'"],
    ['stem_lab/stem_tool_graphcalc.js', "background: '#22c55e', color: '#052e16'"],
    ['stem_lab/stem_tool_optics.js', "background: '#22c55e', color: '#052e16'"],
    ['stem_lab/stem_tool_fisherlab.js', "background: '#10b981', color: '#052e16'"],
    ['stem_lab/stem_tool_roadready.js', "background: '#be123c', color: '#fff'"],
    ['stem_lab/stem_tool_nutritionlab.js', "fontSize: 10, color: '#075985'"],
    ['stem_lab/stem_tool_spacestation.js', "background: '#0ea5e9', color: '#082f49'"],
    ['stem_lab/stem_tool_atctower.js', "background: '#15803d', color: '#fff'"],
    ['stem_lab/stem_tool_flightsim.js', "background: '#1d4ed8', color: '#fff'"],
    ['stem_lab/stem_tool_aquaculture.js', "background: '#b91c1c', color: '#fff'"],
    ['stem_lab/stem_tool_cephalopodlab.js', "background: '#b91c1c', color: '#fff'"],
    ['stem_lab/stem_tool_echolocation.js', "background: '#b91c1c', color: '#fff'"],
    ['stem_lab/stem_tool_birdlab.js', "background: '#047857', color: '#fff'"],
    ['stem_lab/stem_tool_solarsystem.js', 'linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff'],
    ['stem_lab/stem_tool_echotrainer.js', "background: '#4f46e5', color: '#fff'"],
    ['stem_lab/stem_tool_forge.js', "background: '#4f46e5', color: '#fff'"],
  ])('%s pins an accessible small-control treatment', (fileName, treatment) => {
    expect(source(fileName)).toContain(treatment);
  });
});
