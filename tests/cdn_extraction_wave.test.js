import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');
let VisualGeneration;

beforeAll(() => {
  const React = require(resolve(modulesDir, 'react'));
  global.React = window.React = React;
  loadAlloModule('visual_panel_module.js');
  VisualGeneration = window.AlloModules.VisualGeneration;
});

describe('CDN extraction wave contracts', () => {
  it('publishes visual planning and execution as an injected-dependency API', async () => {
    expect(Object.keys(VisualGeneration).sort()).toEqual([
      'encodeFramesToGif', 'executeVisualPlan', 'generateAnimatedPanel', 'generateVisualPlan',
    ].sort());

    const planned = await VisualGeneration.generateVisualPlan(
      'the water cycle', '6', 'English', '', '', null,
      {
        callGemini: async () => JSON.stringify({
          layout: 'single',
          title: 'Water cycle',
          panels: [{ id: 'water', imagenPrompt: 'Water cycle diagram', caption: 'Water moves.' }],
        }),
        cleanJson: value => value,
      },
    );
    expect(planned).toMatchObject({ layout: 'single', panels: [expect.objectContaining({ id: 'water' })] });

    const setGenerationStep = vi.fn();
    const callImagen = vi.fn(async () => 'data:image/png;base64,QUJD');
    const callGeminiImageEdit = vi.fn(async () => 'data:image/png;base64,REVG');
    const executed = await VisualGeneration.executeVisualPlan(planned, 400, 0.8, '', null, {
      callImagen,
      callGeminiImageEdit,
      setGenerationStep,
      t: (_key, values) => `Panel ${values.current}/${values.total}`,
    });
    expect(setGenerationStep).toHaveBeenCalledWith('Panel 1/1');
    expect(callImagen).toHaveBeenCalledTimes(1);
    expect(callGeminiImageEdit).toHaveBeenCalledTimes(1);
    expect(executed.panels[0].imageUrl).toBe('data:image/png;base64,REVG');
  });

  it('keeps rare UI modules demand-loaded and gives visual generation an awaited readiness gate', () => {
    for (const shellName of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const host = read(shellName);
      expect(host, shellName).toContain('window.__alloLazyVisualPanel =');
      expect(host, shellName).toContain('window.__alloLazyGuidedModeBanner =');
      expect(host, shellName).toContain('window.__alloLazyPersonaChat =');
      expect(host, shellName).toContain("window.addEventListener('alloflow:module-registry-changed', finish)");
      expect(host, shellName).toContain("error.code = 'visual-generation-module-unavailable'");
      expect(host, shellName).toContain("moduleKey: 'PersonaChatView'");
      expect(host, shellName).toContain("moduleKey: 'GuidedModeBanner.GuidedModeBanner'");
      expect(host.split(/\r?\n/).some(line => line.trim().startsWith("loadModule('VisualPanelModule'")), shellName).toBe(false);
      expect(host.split(/\r?\n/).some(line => line.trim().startsWith("loadModule('GuidedModeBanner'")), shellName).toBe(false);
      expect(host.split(/\r?\n/).some(line => line.trim().startsWith("loadModule('ViewPersonaChatModule'")), shellName).toBe(false);
    }
  });

  it('keeps generated CDN artifacts byte-identical to their deployment mirrors', () => {
    for (const moduleName of [
      'verification_policy_module.js',
      'persona_session_artifact_module.js',
      'guided_mode_config_module.js',
      'visual_panel_module.js',
    ]) {
      expect(read(`desktop/web-app/public/${moduleName}`), moduleName).toBe(read(moduleName));
    }
  });
});
