import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');
const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];
let SimplifiedView;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  global.React = window.React = React;
  loadAlloModule('view_simplified_module.js');
  SimplifiedView = window.AlloModules?.SimplifiedView;
});

describe('SimplifiedView rigor CDN extraction', () => {
  it('publishes both dependency-injected actions from the existing view module', () => {
    expect(typeof SimplifiedView).toBe('function');
    expect(typeof SimplifiedView.checkAlignment).toBe('function');
    expect(typeof SimplifiedView.regenerateWithRigor).toBe('function');
    expect(read('desktop/web-app/public/view_simplified_module.js')).toBe(read('view_simplified_module.js'));
  });

  it('keeps implementations out of every boot shell and retains fail-closed wrappers', () => {
    for (const file of HOSTS) {
      const host = read(file);
      expect(host, file).toContain('return api.checkAlignment({');
      expect(host, file).toContain('return api.regenerateWithRigor({');
      expect(host, file).toContain("typeof api.checkAlignment === 'function'");
      expect(host, file).toContain("typeof api.regenerateWithRigor === 'function'");
      expect(host, file).toContain('Leveled-text alignment tools are still loading. Try again in a moment.');
      expect(host, file).toContain('window.__alloLazySimplifiedView =');
      expect(host, file).toContain('window.__alloSimplifiedViewRequested = true');
      expect(host, file).toContain("React.createElement(LazySimplifiedView, {");
      expect(host.split(/\r?\n/).some(line => line.trim().startsWith("loadModule('ViewSimplifiedModule'")), file).toBe(false);
      expect(host, file).not.toContain('const validateRigorCitations = (original, candidate) => {');
      expect(host, file).not.toContain('You are a curriculum specialist. Evaluate the rigor of the following text');
    }
    const source = read('view_simplified_source.jsx');
    expect(source).toContain('async function checkSimplifiedAlignment(deps)');
    expect(source).toContain('async function regenerateSimplifiedWithRigor(deps)');
  });

  it('checks alignment, fingerprints the evidence, and updates the matching artifact', async () => {
    const priorContext = window.AlloModules.InstructionalContext;
    window.AlloModules.InstructionalContext = {
      resolveArtifactContext: () => ({
        grade: 'Grade 8',
        standards: { promptText: 'CCSS.ELA-LITERACY.RI.8.1' },
      }),
      fingerprintText: () => 'text-fingerprint',
      fingerprintValue: () => 'standards-fingerprint',
    };
    const generatedContent = {
      id: 'simplified-1',
      type: 'simplified',
      data: 'A source-grounded leveled passage.',
    };
    const setGeneratedContent = vi.fn();
    const setHistory = vi.fn();
    const setIsCheckingAlignment = vi.fn();
    const addToast = vi.fn();
    const speak = vi.fn();
    const botSpeak = vi.fn();
    const callGemini = vi.fn(async () => JSON.stringify({
      evidence: 'The passage cites relevant details.',
      status: 'Aligned',
      rigorReport: 'The demand is retained.',
      missingElements: 'None',
      improvement: 'Add one comparison.',
    }));
    try {
      await SimplifiedView.checkAlignment({
        generatedContent,
        gradeLevel: 'Grade 6',
        leveledTextLanguage: 'English',
        standardsInput: '',
        targetStandards: null,
        alloBotRef: { current: { speak: botSpeak } },
        t: key => key,
        addToast,
        setIsCheckingAlignment,
        callGemini,
        cleanJson: value => value,
        setGeneratedContent,
        setHistory,
        speak,
        warnLog: vi.fn(),
        setError: vi.fn(),
      });
    } finally {
      window.AlloModules.InstructionalContext = priorContext;
    }

    expect(setIsCheckingAlignment.mock.calls.map(call => call[0])).toEqual([true, false]);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGemini.mock.calls[0][0]).toContain('CCSS.ELA-LITERACY.RI.8.1');
    expect(setGeneratedContent).toHaveBeenCalledTimes(1);
    const saved = setGeneratedContent.mock.calls[0][0];
    expect(saved.alignmentCheck).toMatchObject({
      status: 'Aligned',
      contentFingerprint: 'text-fingerprint',
      contextSnapshot: {
        grade: 'Grade 8',
        standardsFingerprint: 'standards-fingerprint',
        standardsText: 'CCSS.ELA-LITERACY.RI.8.1',
      },
    });
    const updateHistory = setHistory.mock.calls[0][0];
    expect(updateHistory([{ id: 'other' }, generatedContent])).toEqual([{ id: 'other' }, saved]);
    expect(botSpeak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith('bot.rigor_feedback_aligned');
    expect(addToast).toHaveBeenCalledWith('alignment.notifications.check_complete', 'success');
  });

  it('does not start an AI request when no standards context exists', async () => {
    const priorContext = window.AlloModules.InstructionalContext;
    window.AlloModules.InstructionalContext = null;
    const callGemini = vi.fn();
    const setIsCheckingAlignment = vi.fn();
    const addToast = vi.fn();
    try {
      await SimplifiedView.checkAlignment({
        generatedContent: { id: 'simplified-2', type: 'simplified', data: 'Text' },
        gradeLevel: 'Grade 5',
        leveledTextLanguage: 'English',
        standardsInput: '',
        targetStandards: null,
        alloBotRef: { current: null },
        t: key => key,
        addToast,
        setIsCheckingAlignment,
        callGemini,
      });
    } finally {
      window.AlloModules.InstructionalContext = priorContext;
    }
    expect(callGemini).not.toHaveBeenCalled();
    expect(setIsCheckingAlignment).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('alignment.notifications.no_standard_error', 'error');
  });
});
