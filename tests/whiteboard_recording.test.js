import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The whiteboard is a standalone popup (no module exports), so the recording
// helpers are sliced out of the source and executed the same way the Video Studio
// popup tests do it. Only the pure geometry/caption helpers are exercised here —
// the MediaRecorder/canvas half needs a real browser.
const html = () => readFileSync(resolve(process.cwd(), 'whiteboard/whiteboard.html'), 'utf-8');

function loadHelpers(convertToExcalidrawElements = (s) => s) {
  const src = html();
  const start = src.indexOf('  var REC_W = 1280, REC_H = 720;');
  const end = src.indexOf('  var recordBusy = false;');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return new Function(
    'E',
    src.slice(start, end) +
      '\nreturn { elementBounds, sceneBounds, frameAnchors, partialPoints, revealElement, buildVtt, cueTextFor, vttTime };'
  )({ convertToExcalidrawElements });
}

describe('whiteboard AI drawing recorder', () => {
  it('walks a polyline by length so lines are drawn on, not popped in', () => {
    const { partialPoints } = loadHelpers();
    const pts = [[0, 0], [10, 0], [20, 0]]; // total length 20

    expect(partialPoints(pts, 1)).toEqual(pts);
    // Halfway is the middle vertex, not "half the vertices".
    const half = partialPoints(pts, 0.5);
    expect(half[half.length - 1][0]).toBeCloseTo(10, 6);
    // A quarter lands mid-first-segment.
    const quarter = partialPoints(pts, 0.25);
    expect(quarter[quarter.length - 1][0]).toBeCloseTo(5, 6);
    // Degenerate input is returned untouched rather than throwing.
    expect(partialPoints([[1, 1]], 0.5)).toEqual([[1, 1]]);
    expect(partialPoints([[0, 0], [0, 0]], 0.5)).toEqual([[0, 0], [0, 0]]);
  });

  it('reveals each element type in the way that suits it', () => {
    const { revealElement } = loadHelpers();

    // Linear: geometry grows, and width/height track the revealed points.
    const arrow = { type: 'arrow', x: 0, y: 0, width: 20, height: 0, points: [[0, 0], [20, 0]] };
    const midArrow = revealElement(arrow, 0.5);
    expect(midArrow.points[midArrow.points.length - 1][0]).toBeCloseTo(10, 6);
    expect(midArrow.width).toBeCloseTo(10, 6);

    // Text: typewriter, never empty (an empty string renders as nothing at all).
    const text = { type: 'text', x: 0, y: 0, text: 'Evaporation' };
    expect(revealElement(text, 0.5).text).toBe('Evapor');
    expect(revealElement(text, 0.01).text.length).toBeGreaterThanOrEqual(1);

    // Shapes: opacity ramp.
    const box = { type: 'rectangle', x: 0, y: 0, width: 10, height: 10 };
    expect(revealElement(box, 0.5).opacity).toBe(50);
    expect(revealElement(box, 0).opacity).toBe(0);
    // Fully revealed returns the original object untouched.
    expect(revealElement(box, 1)).toBe(box);
  });

  it('measures bounds including points that reach outside x/y + width/height', () => {
    const { sceneBounds } = loadHelpers();
    const els = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 100, y: 0, width: 0, height: 0, points: [[0, 0], [50, -30]] },
    ];
    expect(sceneBounds(els)).toEqual([0, -30, 150, 10]);
    // No elements must not produce NaN bounds.
    expect(sceneBounds([]).every(Number.isFinite)).toBe(true);
  });

  it('pins the export frame with invisible corner anchors', () => {
    // Without these, exportToCanvas reframes to the growing element set and the
    // camera drifts on every reveal.
    const { frameAnchors } = loadHelpers();
    const anchors = frameAnchors([0, 0, 200, 100], 24);
    expect(anchors).toHaveLength(2);
    expect(anchors[0].x).toBe(-24);
    expect(anchors[0].y).toBe(-24);
    expect(anchors[1].x).toBe(224);
    expect(anchors[1].y).toBe(124);
    anchors.forEach((a) => {
      expect(a.opacity).toBe(0);
      expect(a.locked).toBe(true);
    });
  });

  it('writes captions Video Studio can import', () => {
    const { buildVtt, vttTime, cueTextFor } = loadHelpers();
    expect(vttTime(0)).toBe('00:00:00.000');
    expect(vttTime(61.5)).toBe('00:01:01.500');

    const vtt = buildVtt([{ start: 0, end: 2, text: 'water cycle' }, { start: 2, end: 4, text: 'Evaporation' }]);
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:00.000 --> 00:00:02.000');
    expect(vtt).toContain('Evaporation');
    // Newlines inside a cue would break the WebVTT block structure.
    expect(buildVtt([{ start: 0, end: 1, text: 'a\nb' }])).toContain('a b');

    // Caption text prefers the element's own words, falling back to its kind.
    expect(cueTextFor({ type: 'text', text: 'Condensation' }, 0)).toBe('Condensation');
    expect(cueTextFor({ type: 'arrow' }, 2)).toContain('Connecting');
    expect(cueTextFor({ type: 'rectangle' }, 1)).toContain('step 2');
  });

  it('is wired into the AI bar and degrades honestly', () => {
    const src = html();
    expect(src).toContain('id="aiRecordBtn"');
    expect(src).toContain("wireAi('aiRecordBtn', 'diagram', { record: true })");
    // Same plan request as ◇ Diagram; only the application differs.
    expect(src).toContain('function applyDiagram(plan, record, promptText)');
    // Every bail-out must release the controls the recorded path disabled.
    expect(src.match(/if \(record\) setAiBusy\(false\)/g) || []).toHaveLength(2);
    // Unsupported browsers are told before they wait for a plan.
    expect(src).toContain('This browser cannot record canvas video.');
    // The launcher pin must move or teachers keep the cached build.
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf-8');
    expect(anti).toContain("/whiteboard/whiteboard.html?v=3");
  });

  it('deploy mirror matches the root whiteboard', () => {
    const mirror = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/whiteboard/whiteboard.html'), 'utf-8');
    expect(mirror).toBe(html());
  });
});
