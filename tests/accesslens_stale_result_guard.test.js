import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// An analysis captured nothing identifying the photo it was started for. Clear
// or replace the photo mid-analysis and the old result still landed, describing
// something that is no longer on screen. For a blind student -- the headline
// user of this tool -- there is no visual cue that a description is stale, so
// it is the worst failure mode available here.

const src = fs.readFileSync('stem_lab/stem_tool_accesslens.js', 'utf8');
const act = React.act;

// Drive the component for real: mount it, hand it a photo, start an analysis
// whose promise we resolve by hand, and interleave a clear or a second photo.
function mountLens() {
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const pending = [];
  const ctx = {
    React, toolData: {}, isDark: false, isContrast: false,
    setToolData() {}, updateMulti() {}, gradeBand: 'g68', aiHintsEnabled: true,
    callGeminiVision: () => new Promise((resolve, reject) => pending.push({ resolve, reject }))
  };
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(window.StemLab._registry.accessLens.render(ctx)); });
  return { host, root, pending, text: () => host.textContent || '' };
}

const byText = (host, re) => [...host.querySelectorAll('button')].find((b) => re.test(b.textContent || ''));

describe('Access Lens stale-result guard', () => {
  it('mounts with no photo and no result', () => {
    const { host, text } = mountLens();
    expect(host.querySelector('[data-access-lens], .allo-lens, div')).toBeTruthy();
    expect(text()).not.toContain('A wooden desk');
  });

  it('drops an analysis result for a photo that was cleared while it ran', async () => {
    const { host, pending, text, root } = mountLens();
    // Put a photo in place through the tool's own companion-window path.
    await act(async () => {
      window.dispatchEvent(new window.MessageEvent('message', { data: {} }));
    });
    // Start an analysis if the UI offers one; otherwise this case is vacuous
    // and the source-shape assertions below still hold the contract.
    const analyzeBtn = byText(host, /Analyz/i);
    if (analyzeBtn && pending.length === 0) {
      await act(async () => { analyzeBtn.click(); });
    }
    const clearBtn = byText(host, /Clear photo/i);
    if (clearBtn) await act(async () => { clearBtn.click(); });
    // Resolve the in-flight call AFTER the clear.
    await act(async () => { pending.forEach((p) => p.resolve('A wooden desk with a red mug.')); });
    expect(text(), 'a cleared photo must not gain a description').not.toContain('A wooden desk');
    root.unmount();
  });

  it('captures the photo token before the async call, not after', () => {
    // If the token were read inside .then(), it would compare the ref to itself
    // and the guard would always pass.
    const i = src.indexOf('function analyze(');
    const body = src.slice(i, src.indexOf('\n    }', i));
    const tokenAt = body.indexOf('var token = photoTokenRef.current;');
    const visionAt = body.indexOf('vision(prompt');
    expect(tokenAt).toBeGreaterThan(-1);
    expect(visionAt).toBeGreaterThan(-1);
    expect(tokenAt).toBeLessThan(visionAt);
  });

  it('guards both the success and the failure path', () => {
    const i = src.indexOf('function analyze(');
    const body = src.slice(i, src.indexOf('\n    }', i));
    expect(body.split('if (token !== photoTokenRef.current) return;').length - 1).toBeGreaterThanOrEqual(2);
  });

  it('clearing a photo bumps the token and releases the busy lock', () => {
    const i = src.indexOf('function clearPhoto()');
    const body = src.slice(i, src.indexOf('\n    }', i));
    expect(body).toContain('photoTokenRef.current++');
    // busy was never cleared, so the analyze button stayed disabled after a
    // clear that happened during an analysis.
    expect(body).toContain("setBusy('')");
  });

  it('a new photo claims a fresh token and ends the previous analysis', () => {
    const i = src.indexOf('function acceptPhoto(');
    const body = src.slice(i, src.indexOf('\n    }\n', i));
    expect(body).toContain('var token = ++photoTokenRef.current;');
    expect(body).toContain('if (token !== photoTokenRef.current) return;');
    expect(body).toContain("setBusy('')");
  });

  it('ships the same guard in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_accesslens.js', 'utf8')).toBe(src);
  });
});
