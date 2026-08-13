import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('Learning Web product naming', () => {
  it('uses Learning Web as the umbrella and Unit Path as the existing unit-builder view', () => {
    expect(read('AlloFlowANTI.txt')).toContain('displayName="Learning Web: Unit Path"');
    expect(read('mind_map_module.js')).toContain("var TOOL_NAME = 'Learning Web: Unit Path'");
    expect(read('view_learning_hub_modal_module.js')).toContain('Learning Web: Unit Path');
    expect(read('allo_commands_module.js')).toContain('Open Learning Web: Unit Path');
    expect(read('view_history_panel_module.js')).toContain('Open this unit in Learning Web: Unit Path');
  });

  it('retains compatibility identifiers for saved units and existing launch gates', () => {
    const source = read('mind_map_module.js');
    expect(source).toContain("var STORAGE_KEY = 'alloflow_throughline_v1'");
    expect(source).toContain("var GENERATOR = 'throughline@1'");
    expect(source).toContain('window.AlloModules.MindMap = ThroughlineModal');
    expect(source).toContain('window.AlloModules.Throughline = ThroughlineModal');
  });
});
