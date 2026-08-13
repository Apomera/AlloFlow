import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const HOSTS = [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab_module.js',
  'desktop/web-app/build/stem_lab/stem_lab_module.js',
  'desktop/web-app/build/stem_lab_module.js',
];

describe.each(HOSTS)('shared STEM scrolling contract — %s', (host) => {
  const source = readFileSync(host, 'utf8');

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
});
