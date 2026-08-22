import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from '@babel/parser';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const rootSource = readFileSync('AlloFlowANTI.txt', 'utf8');
const moduleSource = readFileSync('dynamic_assessment_module.js', 'utf8');
const moduleMirror = readFileSync('desktop/web-app/public/dynamic_assessment_module.js', 'utf8');
const gateStart = rootSource.indexOf('<CDNModuleGate moduleKey="DynamicAssessment"');
const nextGate = rootSource.indexOf('<CDNModuleGate moduleKey="CommunityCatalog"', gateStart);
const gateSource = rootSource.slice(gateStart, nextGate);

const hostKeys = [
  'addToast',
  'autoRemoveWords',
  'callGemini',
  'callGeminiImageEdit',
  'callImagen',
  'cleanJson',
  'gradeLevel',
  'handleGenerate',
  'handleRestoreView',
  'history',
  'leveledTextLanguage',
  'selectedLanguages',
  'setGeneratedContent',
  'setHistory',
  'setIsDynamicAssessmentOpen',
  'setIsGeneratingTermImage',
  'studentNickname',
  't'
];

let React;
let DynamicAssessment;
let HostAdapter;

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('dynamic_assessment_module.js');
  DynamicAssessment = window.AlloModules.DynamicAssessment;
  HostAdapter = DynamicAssessment.HostAdapter;
});

afterEach(() => {
  vi.useRealTimers();
  delete window.AlloSheetHostBridge;
  document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-contrast');
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-contrast');
});

function makeHost(overrides = {}) {
  const history = [
    ...Array.from({ length: 7 }, (_, index) => ({ id: `probe-${index + 1}`, type: 'math-fluency-probe' })),
    { id: 'glossary-1', type: 'glossary', title: 'Fractions', fromDA: true, data: [{ term: 'numerator' }, { term: 'denominator' }] },
    { id: 'manipulative-1', type: 'manipulative-resource', title: 'Fraction tiles', fromDA: true, toolId: 'fraction-tiles', data: { preset: {} } }
  ];
  return {
    addToast: vi.fn(),
    autoRemoveWords: false,
    callGemini: vi.fn(),
    callGeminiImageEdit: vi.fn(),
    callImagen: vi.fn(),
    cleanJson: (value) => value,
    gradeLevel: 'Grade 5',
    handleGenerate: vi.fn(),
    handleRestoreView: vi.fn(),
    history,
    leveledTextLanguage: 'Spanish',
    selectedLanguages: ['Spanish'],
    setGeneratedContent: vi.fn(),
    setHistory: vi.fn(),
    setIsDynamicAssessmentOpen: vi.fn(),
    setIsGeneratingTermImage: vi.fn(),
    studentNickname: 'Blue Otter',
    t: (key) => key,
    ...overrides
  };
}

function mountContract(overrides = {}) {
  const host = makeHost(overrides);
  const StubAssessment = () => null;
  const overlay = HostAdapter({ React, DynamicAssessment: StubAssessment, host });
  const panel = overlay.props.children;
  const assessment = panel.props.children;
  return { host, overlay, panel, assessment, StubAssessment };
}

describe('Dynamic Assessment host-adapter extraction', () => {
  it('keeps the app shell small and the callback implementation in the existing lazy module', () => {
    expect(gateStart).toBeGreaterThan(-1);
    expect(nextGate).toBeGreaterThan(gateStart);
    expect(Buffer.byteLength(gateSource)).toBeLessThan(5_000);
    expect(gateSource).toContain('DA && DA.HostAdapter');
    expect(gateSource).toContain('DynamicAssessment: DA');
    expect(gateSource).not.toContain('onGenerateGlossary: async');
    expect(gateSource).not.toContain('onGenerateVisualOrganizer: async');
    expect(moduleSource).toContain('function DynamicAssessmentHostAdapter(props)');
    expect(moduleSource).toContain('onGenerateGlossary: async');
    expect(moduleSource).toContain('onGenerateVisualOrganizer: async');
    expect(moduleSource).toContain('DynamicAssessment.HostAdapter = DynamicAssessmentHostAdapter');
    expect(moduleSource).toContain('version: "1.4.1-host-adapter"');
    expect(moduleMirror).toBe(moduleSource);
    expect(rootSource.match(/dynamic_assessment_module\.js/g)).toHaveLength(1);
    for (const key of hostKeys) expect(gateSource).toMatch(new RegExp(`\\b${key},`));
    expect(() => parse(rootSource, { sourceType: 'module', plugins: ['jsx'] })).not.toThrow();
    expect(() => parse(moduleSource, { sourceType: 'script' })).not.toThrow();
  });

  it('derives the same learner, fluency, and resource props at the lazy boundary', () => {
    const { host, overlay, panel, assessment, StubAssessment } = mountContract();
    expect(HostAdapter).toBeTypeOf('function');
    expect(assessment.type).toBe(StubAssessment);
    expect(assessment.props.React).toBe(React);
    expect(assessment.props.studentNickname).toBe('Blue Otter');
    expect(assessment.props.outputLanguage).toBe('Spanish');
    expect(assessment.props.mathFluencyProbes.map((probe) => probe.id)).toEqual([
      'probe-7', 'probe-6', 'probe-5', 'probe-4', 'probe-3'
    ]);
    expect(assessment.props.daResourceManifest).toEqual([
      expect.objectContaining({ id: 'manipulative-1', kind: 'math-manipulative', toolId: 'fraction-tiles' }),
      expect.objectContaining({ id: 'glossary-1', kind: 'glossary', summary: 'numerator, denominator' })
    ]);

    const stopPropagation = vi.fn();
    panel.props.onClick({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    overlay.props.onClick();
    assessment.props.onClose();
    expect(host.setIsDynamicAssessmentOpen).toHaveBeenNthCalledWith(1, false);
    expect(host.setIsDynamicAssessmentOpen).toHaveBeenNthCalledWith(2, false);
  });

  it('preserves the AlloSheet transfer handshake and selected host theme', async () => {
    document.documentElement.classList.add('theme-light');
    const decision = Promise.resolve({ status: 'accepted' });
    const delivered = Promise.resolve();
    window.AlloSheetHostBridge = {
      open: vi.fn(),
      openTransfer: vi.fn(() => ({ decision, delivered }))
    };
    const { host, assessment } = mountContract();
    const artifact = { kind: 'alloflow.tabular.v1' };

    await expect(assessment.props.onOpenAlloSheet(artifact)).resolves.toBe(true);
    await decision;
    expect(window.AlloSheetHostBridge.openTransfer).toHaveBeenCalledWith({ theme: 'light', artifact });
    expect(host.addToast).toHaveBeenCalledWith('Dynamic Assessment tables opened in AlloSheet for review.', 'success');
  });

  it('keeps history navigation recoverable for missing and existing resources', () => {
    vi.useFakeTimers();
    const { host, assessment } = mountContract();

    assessment.props.onOpenResource('missing');
    expect(host.addToast).toHaveBeenCalledWith('toasts.resource_not_found_history', 'info');
    expect(host.handleRestoreView).not.toHaveBeenCalled();

    assessment.props.onOpenResource('glossary-1');
    expect(host.setIsDynamicAssessmentOpen).toHaveBeenCalledWith(false);
    expect(host.handleRestoreView).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(host.handleRestoreView).toHaveBeenCalledWith(expect.objectContaining({ id: 'glossary-1' }));
  });
});
