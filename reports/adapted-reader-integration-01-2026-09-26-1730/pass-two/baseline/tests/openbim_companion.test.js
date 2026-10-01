import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const files = [
  path.join(root, 'stem_lab', 'stem_tool_openbim.js'),
  path.join(root, 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_openbim.js'),
];

function loadBridge(file = files[0]) {
  const source = fs.readFileSync(file, 'utf8');
  const sandbox = {
    console,
    setTimeout,
    window: {
      StemLab: {
        _registry: {},
        _order: [],
        registerTool(id, config) {
          config.id = id;
          this._registry[id] = config;
          this._order.push(id);
        },
      },
    },
  };
  vm.runInNewContext(source, sandbox, { filename: file });
  return sandbox.window;
}

describe('OpenBIM Companion', () => {
  it('registers a standalone engineering tool and exposes testable planning helpers', () => {
    const window = loadBridge();
    expect(window.StemLab._registry.openBim).toMatchObject({
      name: 'OpenBIM Companion',
      category: 'engineering',
    });
    expect(window.StemLab._registry.openBim.aliases).toContain('Bonsai');
    expect(window.OpenBIMBridge.schema).toBe('org.alloflow.openbim-project');
    expect(window.OpenBIMBridge.allowedClasses).toContain('IfcWall');
  });

  it('turns an everyday brief into a conservative semantic IFC proposal', () => {
    const api = loadBridge().OpenBIMBridge;
    const plan = api.buildFallbackPlan(
      'Create an accessible two-storey library with daylight, a makerspace, quiet space, and two exits.',
      { storeys: 1 },
    );

    expect(plan.storeys).toHaveLength(2);
    expect(plan.storeys.flatMap((storey) => Array.from(storey.spaces))).toContain('Makerspace');
    expect(plan.goals.join(' ')).toMatch(/inclusive route/i);
    expect(plan.assumptions.join(' ')).toMatch(/not a construction document/i);
    expect(api.validatePlan(plan)).toEqual([]);
    for (const item of plan.elements) {
      expect(api.allowedClasses).toContain(item.ifcClass);
      expect(item.count).toBeGreaterThan(0);
      expect(item.count).toBeLessThanOrEqual(40);
    }
  });

  it('normalizes AI output through a narrow IFC allowlist', () => {
    const api = loadBridge().OpenBIMBridge;
    const plan = api.normalizeAiPlan(JSON.stringify({
      name: '<b>Injected</b> Learning Center',
      storeys: [{ name: 'Ground Floor', elevationMetres: 0, spaces: ['Studio', '<script>bad</script> Quiet Room'] }],
      elements: [
        { ifcClass: 'IfcWall', name: 'Exterior walls', count: 900, storey: 'Unknown level', reason: 'Envelope' },
        { ifcClass: 'IfcPerson', name: 'Not a building element', count: 1, storey: 'Ground Floor' },
      ],
      goals: ['Inclusive circulation'],
      assumptions: ['Concept only'],
    }), 'An accessible learning center', { storeys: 1 });

    expect(plan.name).toBe('Injected Learning Center');
    expect(plan.elements).toHaveLength(1);
    expect(plan.elements[0]).toMatchObject({ ifcClass: 'IfcWall', count: 40, storey: 'Ground Floor' });
    expect(plan.storeys[0].spaces.join(' ')).not.toContain('<script>');
    expect(api.validatePlan(plan)).toEqual([]);
  });

  it('sanitizes Architecture Studio blocks as bounded, unclassified proxy geometry', () => {
    const api = loadBridge().OpenBIMBridge;
    const summary = api.summarizeArchitecture([
      { x: 0, y: 0, z: 0, shape: 'door', material: '<b>stone</b>', rotation: 1 },
      { x: 300, y: 2, z: 4, shape: 'unsupported', material: 'wood' },
      { x: 'bad', y: 0, z: 0, material: 'ignored' },
    ]);
    const plan = api.buildFallbackPlan('A compact classroom', { architecture: summary });

    expect(summary).toMatchObject({ blockCount: 2, widthUnits: 101, depthUnits: 5, heightUnits: 3, unitMetres: 1 });
    expect(summary.blocks[0]).toMatchObject({ shape: 'door', material: 'stone', rotation: 1 });
    expect(summary.blocks[1]).toMatchObject({ x: 100, shape: 'block' });
    expect(plan.architectureStudio.blockCount).toBe(2);
    expect(plan.assumptions.join(' ')).toMatch(/not automatically classified/i);
  });

  it('imports only its own recipe schema, drops unsupported classes, and requires fresh approval', () => {
    const api = loadBridge().OpenBIMBridge;
    const exported = api.buildRecipe(api.buildFallbackPlan('An accessible classroom', {
      architecture: api.summarizeArchitecture([{ x: 1, y: 2, z: 3, shape: 'window', material: 'glass' }]),
    }));
    exported.name = '<img src=x> Resumed model';
    exported.elements.push({ ifcClass: 'IfcPerson', name: 'Injected person', count: 1, storey: 'Ground Floor' });
    exported.approvedAt = 'untrusted';
    exported.unknownExecutableField = 'do something';

    const result = api.normalizeImportedRecipe(JSON.stringify(exported));
    expect(result.errors).toEqual([]);
    expect(result.plan.status).toBe('proposal');
    expect(result.plan.name).toBe('Resumed model');
    expect(result.plan.elements.some((item) => item.ifcClass === 'IfcPerson')).toBe(false);
    expect(result.plan).not.toHaveProperty('approvedAt');
    expect(result.plan).not.toHaveProperty('unknownExecutableField');
    expect(result.warnings.join(' ')).toMatch(/approval was cleared/i);
    expect(api.normalizeImportedRecipe('{bad json').plan).toBeNull();
    expect(api.normalizeImportedRecipe({ schema: 'unknown', version: 1 }).plan).toBeNull();
  });

  it('surfaces model-readiness questions without making code or safety claims', () => {
    const api = loadBridge().OpenBIMBridge;
    const plan = api.buildFallbackPlan(
      'An accessible two-storey library with daylight and two exits',
      { architecture: api.summarizeArchitecture([{ x: 0, y: 0, z: 0 }]) },
    );
    const readiness = api.analyzePlan(plan);

    expect(readiness.readyForConceptExport).toBe(true);
    expect(readiness.checks.join(' ')).toMatch(/proxy geometry/i);
    expect(readiness.questions.join(' ')).toMatch(/accessible route/i);
    expect(readiness.questions.join(' ')).toMatch(/one-metre proxy boxes/i);
  });

  it('exports an approved portable recipe and an inspectable IfcOpenShell starter', () => {
    const api = loadBridge().OpenBIMBridge;
    const plan = api.buildFallbackPlan('A one-storey art studio with storage and natural light', {
      storeys: 1,
      architecture: api.summarizeArchitecture([{ x: 4, y: 2, z: 7, shape: 'roof', material: 'brick' }]),
    });
    const recipe = api.buildRecipe(plan);
    const python = api.buildIfcPython(recipe);

    expect(recipe).toMatchObject({
      schema: 'org.alloflow.openbim-project',
      version: 1,
      status: 'approved-concept',
      ifcSchema: 'IFC4',
    });
    expect(recipe.interoperability.limitations).toMatch(/does not certify/i);
    expect(recipe.reviewQuestions.length).toBeGreaterThan(0);
    expect(python).toContain('ifcopenshell.api.project.create_file(version="IFC4")');
    expect(python).toContain('unit_type="LENGTHUNIT"');
    expect(python).toContain('ifcopenshell.api.context.add_context');
    expect(python).toContain('ifcopenshell.api.geometry.add_mesh_representation');
    expect(python).toContain('ifcopenshell.api.geometry.assign_representation');
    expect(python).toContain('ifcopenshell.api.pset.edit_pset');
    expect(python).toContain('ifc_class="IfcBuildingElementProxy"');
    expect(python).toContain('origin_y = float(block["z"])');
    expect(python).toContain('origin_z = float(block["y"])');
    expect(python).toContain('ifcopenshell.api.spatial.assign_container');
    expect(python).toContain('model.write(output_path)');
    expect(python).toContain('optional approximate proxy geometry');
    expect(python).not.toContain('eval(');
    expect(python).not.toContain('exec(');
    // macOS ships python3 only; fall back for environments with just `python`.
    const pythonBin = spawnSync('python3', ['--version']).status === 0 ? 'python3' : 'python';
    const syntaxCheck = spawnSync(pythonBin, ['-c', 'import sys; compile(sys.stdin.read(), "generated_openbim.py", "exec")'], {
      input: python,
      encoding: 'utf8',
    });
    expect(syntaxCheck.stderr).toBe('');
    expect(syntaxCheck.status).toBe(0);
  });

  it('keeps the catalog, lazy loader, plugin-only renderer, and deploy mirror connected', () => {
    const hub = fs.readFileSync(path.join(root, 'stem_lab', 'stem_lab_module.js'), 'utf8');
    const anti = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8');
    expect(hub).toContain("id: 'openBim'");
    expect(hub).toContain('archStudio: true, openBim: true');
    expect(anti).toContain("'stem_lab/stem_tool_openbim.js'");

    const hashes = files.map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    expect(hashes[0]).toBe(hashes[1]);
  });
});
