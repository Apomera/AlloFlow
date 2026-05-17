import { test, expect } from '@playwright/test';

/**
 * For flagship 20K tools, load their CDN module + simulate a render call
 * with React-mock and verify it produces a non-empty element tree.
 *
 * This catches JS errors in the tool's render() that would crash in the UI.
 */
const FLAGSHIP = [
  { id: 'opticsLab', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_optics.js' },
  { id: 'solarSystem', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_solarsystem.js' },
  { id: 'plateTectonics', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_platetectonics.js' },
  { id: 'cell', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_cell.js' },
  { id: 'chemBalance', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_chembalance.js' },
  { id: 'raptorHunt', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_raptorhunt.js' },
];

test.describe('Flagship tools — render without throwing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  for (const tool of FLAGSHIP) {
    test(`${tool.id} renders with mock React`, async ({ page }) => {
      const result = await page.evaluate(async ({ id, url }) => {
        const w = window as any;
        if (!w.StemLab) {
          w.StemLab = { _registry: {}, _order: [], registerTool: function(toolId: string, c: any) { c.id = toolId; this._registry[toolId] = c; this._order.push(toolId); } };
        }
        // Load tool
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = url;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('load fail'));
          document.head.appendChild(s);
        });
        const tool = w.StemLab._registry[id];
        if (!tool) return { ok: false, error: `Tool ${id} not registered` };
        if (typeof tool.render !== 'function') return { ok: false, error: `Tool ${id} has no render function` };

        // Mock React with createElement that returns a tree
        const mockReact = {
          createElement: (type: any, props: any, ...children: any[]) => ({ type, props, children: children.flat(Infinity).filter((c: any) => c !== null && c !== undefined && c !== false) }),
          useState: (v: any) => [v, () => {}],
          useEffect: () => {},
          useRef: () => ({ current: null }),
          useMemo: (fn: any) => fn(),
          useCallback: (fn: any) => fn,
        };
        const stubIcon = function() { return null; };
        const icons = new Proxy({}, { get: () => stubIcon });
        const ctx = {
          React: mockReact,
          toolData: { [id]: {} },
          setToolData: () => {},
          awardXP: () => {},
          callTTS: null,
          announceToSR: () => {},
          icons,
          setStemLabTool: () => {},
          gradeLevel: '6',
          callGemini: null,
          setToolSnapshots: () => {},
          canvasNarrate: () => {},
          addToast: () => {},
          t: (k: string) => k,
        };
        try {
          const out = tool.render(ctx);
          return { ok: true, rendered: !!out, hasChildren: !!(out && (out.children || out.props)) };
        } catch (e: any) {
          return { ok: false, error: String(e?.message || e).slice(0, 300) };
        }
      }, { id: tool.id, url: tool.url });

      expect(result.ok, `Render failed for ${tool.id}: ${result.error}`).toBeTruthy();
      expect(result.rendered).toBeTruthy();
    });
  }
});
