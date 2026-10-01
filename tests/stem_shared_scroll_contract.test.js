import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'acorn';

// desktop/web-app/build/ is a gitignored build output: a fresh checkout (CI) has none, and reading
// it at collection time threw ENOENT and failed the whole file. Those two copies are checked only
// once they have been built; otherwise their suites are reported as skipped. The committed copies
// are always required.
const BUILD_HOSTS = [
  'desktop/web-app/build/stem_lab/stem_lab_module.js',
  'desktop/web-app/build/stem_lab_module.js',
];
const HOSTS = [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab_module.js',
  ...BUILD_HOSTS,
];

function findScrollRegionCall(source) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  const pending = [ast];

  while (pending.length > 0) {
    const node = pending.pop();
    if (
      node.type === 'CallExpression'
      && node.callee?.type === 'MemberExpression'
      && node.callee.object?.name === 'React'
      && node.callee.property?.name === 'createElement'
    ) {
      const props = node.arguments[1];
      const hasScrollMarker = props?.type === 'ObjectExpression' && props.properties.some((property) => {
        const key = property.key;
        return key?.name === 'data-stem-scroll-region' || key?.value === 'data-stem-scroll-region';
      });
      if (hasScrollMarker) return node;
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object' && typeof child.type === 'string') pending.push(child);
        }
      } else if (value && typeof value === 'object' && typeof value.type === 'string') {
        pending.push(value);
      }
    }
  }

  return null;
}

for (const host of HOSTS) {
const unbuilt = BUILD_HOSTS.includes(host) && !existsSync(host);
describe.skipIf(unbuilt)(`shared STEM scrolling contract — ${host}${unbuilt ? ' (skipped: gitignored build output not present)' : ''}`, () => {
  const source = unbuilt ? '' : readFileSync(host, 'utf8');

  it('bounds the modal shell independently of injected utility CSS', () => {
    const shellStart = source.indexOf('className: "stem-lab-modal-shell');
    expect(shellStart).toBeGreaterThan(-1);
    const shell = source.slice(shellStart, shellStart + 900);

    expect(shell).toContain("display: 'flex'");
    expect(shell).toContain("flexDirection: 'column'");
    expect(shell).toContain("height: '100%'");
    expect(shell).toContain("maxHeight: 'calc(100% - 16px)'");
    expect(shell).toContain('minHeight: 0');
    expect(shell).toContain("overflow: 'hidden'");
  });

  it('keeps one independently scrollable workspace inside the locked page', () => {
    const regionStart = source.indexOf('className: "stem-lab-scroll-region');
    expect(regionStart).toBeGreaterThan(-1);
    const region = source.slice(regionStart, regionStart + 1200);

    expect(region).toContain('"data-stem-scroll-region": "true"');
    expect(region).toContain('"data-stem-scroll-contract": "vertical"');
    expect(region).toContain("flex: '1 1 0%'");
    expect(region).toContain('minHeight: 0');
    expect(region).toContain("overflowY: 'auto'");
    expect(region).toContain("touchAction: 'pan-y'");
    expect(region).toContain("scrollbarGutter: 'stable'");

    // The page remains intentionally locked while the modal is open, so this
    // inner contract is the required escape path for every STEM workspace.
    expect(source).toContain("body.style.overflow = 'hidden'");
  });

  it('nests active plugin tools inside that scrollable workspace', () => {
    const regionCall = findScrollRegionCall(source);
    const pluginRenderer = source.indexOf("stemLabTab === 'explore' && stemLabTool && window.StemLab && (function _pluginFallback()");

    expect(regionCall).not.toBeNull();
    expect(pluginRenderer).toBeGreaterThan(-1);
    expect(regionCall.start).toBeLessThan(pluginRenderer);
    expect(regionCall.end).toBeGreaterThan(pluginRenderer);
  });
});
}
