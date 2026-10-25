import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from '@babel/parser';
import { loadAlloModule } from './setup.js';
import { createRealDaWorkspaceFixture } from './helpers/dynamic_assessment_workspace_fixture.js';

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
let createRoot;
let flushSync;
let protectedFixture;
const mountedAdapters = [];

beforeAll(async () => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  ({ flushSync } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom')));
  globalThis.React = window.React = React;
  loadAlloModule('dynamic_assessment_module.js');
  DynamicAssessment = window.AlloModules.DynamicAssessment;
  HostAdapter = DynamicAssessment.HostAdapter;
  protectedFixture = await createRealDaWorkspaceFixture(React);
});
beforeEach(() => { window.AlloModules.SensitiveWorkspace = protectedFixture.api; });
afterAll(() => protectedFixture?.dispose());

afterEach(() => {
  mountedAdapters.splice(0).forEach(({ root, container }) => {
    flushSync(() => root.unmount());
    container.remove();
  });
  vi.useRealTimers();
  vi.restoreAllMocks();
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
  let overlay;
  const createElement = React.createElement;
  vi.spyOn(React, 'createElement').mockImplementation((type, props, ...children) => {
    const element = createElement(type, props, ...children);
    if (type === 'div' && props?.className === 'fixed inset-0 z-[60] bg-black/50 overflow-y-auto') overlay = element;
    return element;
  });
  function CaptureAdapter() {
    return React.createElement(HostAdapter, { React, DynamicAssessment: StubAssessment, host });
  }
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedAdapters.push({ root, container });
  flushSync(() => root.render(React.createElement(CaptureAdapter)));
  const panel = overlay.props.children;
  const assessment = panel.props.children[0];
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
    expect(moduleSource).toContain('onGenerateGlossary: blocked');
    expect(moduleSource).toContain('onGenerateVisualOrganizer: blocked');
    expect(moduleSource).toContain('ProtectedDynamicAssessment.HostAdapter = daProtectedComponent(DynamicAssessmentHostAdapter)');
    expect(moduleSource).toContain('version: "1.4.1-host-adapter"');
    expect(moduleMirror).toBe(moduleSource);
    // The release integrity manifest also names this asset. Count the runtime
    // load site rather than treating that data entry as a duplicate loader.
    expect(rootSource.match(/loadModule\(\s*['"]DynamicAssessment['"]\s*,\s*['"][^'"]*dynamic_assessment_module\.js(?:\?[^'"]*)?['"]/g)).toHaveLength(1);
    // Each host key is passed through; the AI callbacks are passed as
    // `key: (studentAiFeaturesHidden ? null : key)` since 2026-09-14.
    for (const key of hostKeys) expect(gateSource).toMatch(new RegExp(`\\b${key},|\\b${key}: \\(studentAiFeaturesHidden \\? null : ${key}\\)`));
    expect(() => parse(rootSource, { sourceType: 'module', plugins: ['jsx'] })).not.toThrow();
    expect(() => parse(moduleSource, { sourceType: 'script' })).not.toThrow();
  });

  it('preserves learner settings and prevents automatic parent-history imports at the protected boundary', () => {
    const { host, overlay, panel, assessment, StubAssessment } = mountContract();
    expect(HostAdapter).toBeTypeOf('function');
    expect(assessment.type).toBe(StubAssessment);
    expect(assessment.props.React).toBe(React);
    expect(assessment.props.studentNickname).toBe('Blue Otter');
    expect(assessment.props.outputLanguage).toBe('Spanish');
    expect(assessment.props.mathFluencyProbes).toEqual([]);
    expect(assessment.props.daResourceManifest).toEqual([]);
    expect(assessment.props.sensitiveWorkspace).toBe(protectedFixture.session);

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

  it('blocks parent-history navigation while protected resource routing is unavailable', () => {
    const { host, assessment } = mountContract();

    expect(() => assessment.props.onOpenResource('missing')).toThrow('protected resource route');
    expect(host.handleRestoreView).not.toHaveBeenCalled();

    expect(() => assessment.props.onOpenResource('glossary-1')).toThrow('protected resource route');
    expect(host.setIsDynamicAssessmentOpen).not.toHaveBeenCalled();
    expect(host.handleRestoreView).not.toHaveBeenCalled();
  });
});
