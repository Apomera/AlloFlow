import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const source = readFileSync(resolve(process.cwd(), 'concept_pictionary_source.jsx'), 'utf8');
const shell = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const protocol = readFileSync(resolve(process.cwd(), 'docs/LIVE_SESSION_PROTOCOL.md'), 'utf8');

let api;
beforeAll(() => {
  window.React = window.React || {
    useState: () => [undefined, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useContext: () => null,
    memo: (component) => component,
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('concept_pictionary_module.js');
  api = window.AlloModules.ConceptPictionary;
  if (!api) throw new Error('ConceptPictionary failed to register');
});

const makeStroke = (index, overrides = {}) => ({
  uid: 'student-secret',
  codename: 'Blue Fox',
  groupId: 'group-secret',
  strokeId: `stroke-${index}`,
  color: '#2b6cb0',
  points: Array.from({ length: 40 }, (_, point) => [point, point + index]),
  ...overrides,
});

describe('Sketch vision feedback privacy contracts', () => {
  it('removes identity fields and independently bounds the analysis stroke payload', () => {
    const safe = api.sanitizeSketchVisionStrokes(
      Array.from({ length: 400 }, (_, index) => makeStroke(index)),
    );
    const serialized = JSON.stringify(safe);

    expect(safe.length).toBeLessThanOrEqual(320);
    expect(safe.reduce((sum, stroke) => sum + stroke.points.length, 0)).toBeLessThanOrEqual(10000);
    expect(serialized).not.toContain('student-secret');
    expect(serialized).not.toContain('Blue Fox');
    expect(serialized).not.toContain('group-secret');
    expect(serialized).not.toContain('"uid"');
    expect(serialized).not.toContain('"codename"');
    expect(serialized).not.toContain('"groupId"');
  });

  it('builds an evidence-limited prompt and accepts only bounded JSON feedback', () => {
    const prompt = api.buildSketchVisionFeedbackPrompt(
      'Draw the water cycle',
      'Show evaporation, condensation, and precipitation',
    );

    expect(prompt).toContain('using only visible evidence');
    expect(prompt).toContain('Acknowledge uncertainty');
    expect(prompt).toContain('Do not identify a student');
    expect(prompt).toContain('DRAWING PROMPT: "Draw the water cycle"');
    expect(prompt).toContain('SUCCESS CRITERION: "Show evaporation, condensation, and precipitation"');
    expect(prompt).not.toContain('student-secret');

    expect(api.normalizeSketchVisionFeedbackResult('```json\n{"feedback":"Clear arrows. Label condensation next."}\n```'))
      .toBe('Clear arrows. Label condensation next.');
    expect(api.normalizeSketchVisionFeedbackResult(JSON.stringify({ feedback: 'x'.repeat(900) })))
      .toBe('x'.repeat(800));
    expect(api.normalizeSketchVisionFeedbackResult('not JSON')).toBeNull();
    expect(api.normalizeSketchVisionFeedbackResult('{"other":"field"}')).toBeNull();
  });

  it('rasterizes to an opaque bounded PNG without returning identity metadata', () => {
    const operations = [];
    const context = {
      save: () => operations.push(['save']),
      restore: () => operations.push(['restore']),
      fillRect: (...args) => operations.push(['fillRect', ...args]),
      beginPath: () => operations.push(['beginPath']),
      moveTo: (...args) => operations.push(['moveTo', ...args]),
      lineTo: (...args) => operations.push(['lineTo', ...args]),
      stroke: () => operations.push(['stroke']),
      set globalCompositeOperation(value) { operations.push(['composite', value]); },
      set fillStyle(value) { operations.push(['fillStyle', value]); },
      set strokeStyle(value) { operations.push(['strokeStyle', value]); },
      set lineWidth(value) { operations.push(['lineWidth', value]); },
      set lineCap(value) { operations.push(['lineCap', value]); },
      set lineJoin(value) { operations.push(['lineJoin', value]); },
      set globalAlpha(value) { operations.push(['globalAlpha', value]); },
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
      toDataURL: () => 'data:image/png;base64,c2tldGNo',
    };
    const raster = api.rasterizeSketchForVision([
      makeStroke(1, { points: [[10, 10], [20, 20]] }),
      makeStroke(2, { color: '__eraser__', points: [[15, 15], [18, 18]] }),
    ], () => canvas);

    expect(raster).toEqual({
      base64: 'c2tldGNo',
      mimeType: 'image/png',
      width: 720,
      height: 480,
      strokeCount: 2,
      pointCount: 4,
    });
    expect(canvas.width).toBe(720);
    expect(canvas.height).toBe(480);
    expect(operations).toContainEqual(['fillStyle', '#fffefb']);
    expect(operations).toContainEqual(['strokeStyle', '#fffefb']);
    expect(operations.filter((entry) => entry[0] === 'composite').every((entry) => entry[1] === 'source-over')).toBe(true);
    expect(JSON.stringify(raster)).not.toContain('uid');
    expect(JSON.stringify(raster)).not.toContain('codename');
    expect(JSON.stringify(raster)).not.toContain('groupId');
  });

  it('rejects empty, invalid, and oversized raster exports before provider use', () => {
    expect(api.rasterizeSketchForVision([], () => null)).toBeNull();
    expect(api.rasterizeSketchForVision([makeStroke(1)], () => ({ getContext: () => null }))).toBeNull();
    expect(api.rasterizeSketchForVision([makeStroke(1)], () => ({
      getContext: () => ({
        save() {}, restore() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
      }),
      toDataURL: () => `data:image/png;base64,${'a'.repeat(1500001)}`,
    }))).toBeNull();
  });
});

describe('Sketch vision feedback integration boundaries', () => {
  it('uses the configured provider bridge only after the teacher action', () => {
    expect(shell).toContain("typeof ai.analyzeImage === 'function'");
    expect(shell).toContain("_sketchVisionBackend === 'gemini' && typeof callGeminiVision === 'function'");
    expect(shell).toContain('callGeminiVision: _callSketchVision');
    expect(shell).toContain('visionFeedbackAvailable: _sketchVisionAvailable');
    expect(shell).toContain('visionProviderLabel: _sketchVisionProviderLabel');
    expect(source).toContain('onClick={() => onAnalyzeSketch(participant.uid)}');
    expect(source).toContain('callGeminiVision(prompt, raster.base64, raster.mimeType)');
    expect(source).toContain('Nothing is sent until you click Analyze sketch with AI');
  });

  it('keeps teacher review, private delivery, revision, and targeted resources in the existing owner', () => {
    expect(source).toContain('Review or edit the draft before private P2P delivery');
    expect(source).toContain('onSendFeedback(participant.uid)');
    expect(source).toContain('Send + allow one revision');
    expect(source).toContain('onSendToStudent(participant.uid, followUpResourceId)');
    expect(source).toContain('onSendToGroup(groupId, followUpResourceId)');
    expect(protocol).toContain('no image is sent automatically');
    expect(protocol).toContain('Neither path includes uid, codename, group, roster, or resource assignment');
  });

  it('preserves the original text-only AI path and aggregate-only telemetry claims', () => {
    expect(source).toContain("AI polish is text-only: it receives the teacher's observation note");
    expect(source).toContain("'TEACHER OBSERVATION: ' + JSON.stringify(note");
    expect(source).toContain('feedbackSent: Object.keys(sketchFeedbackByUid).length');
    expect(source).not.toContain('visionFeedback: Object.keys');
    expect(protocol).toContain('Activity Pulse receives only revised, feedback-sent');
  });
});
