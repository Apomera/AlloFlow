import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const { extractAppStyles } = require('../dev-tools/app_styles_extraction.cjs');
const { buildAppStylesModule } = require('../_build_app_styles_module.js');
const source = readFileSync('app_styles_source.jsx', 'utf8');
const React = require('../desktop/web-app/node_modules/react');
const server = require('../desktop/web-app/node_modules/react-dom/server');
function load(code, extra = {}) {
  const context = { window: { React }, URL, ...extra };
  vm.runInNewContext(code, context);
  return context.window.AlloModules.AppStyles.AppStyles;
}
describe('AppStyles render boundary and external CSS experiment', () => {
  it('memoizes the real stylesheet component and retains its dynamic preferences', () => {
    const View = load(buildAppStylesModule(source));
    expect(View.$$typeof).toBe(Symbol.for('react.memo'));
    const html = server.renderToStaticMarkup(React.createElement(View, { baseFontSize: 24, lineHeight: 2, letterSpacing: 0.12, disableAnimations: true }));
    expect(html).toContain('font-size: 24px');
    expect(html).toContain('line-height: 2 !important');
    expect(html).toContain('letter-spacing: 0.12em !important');
    expect(html).toContain('animation: none !important');
  });
  it('extracts only the large unconditional constant block and preserves runtime CSS exactly', () => {
    const result = extractAppStyles(source);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].file).toMatch(/^app_styles\.[0-9a-f]{16}\.css$/);
    const tree = load(buildAppStylesModule(source)).type({});
    const css = tree.props.children.find(child => child?.props?.['data-docsuite-theme'] === 'v1').props.children;
    expect(result.assets[0].content).toBe(css);
    const external = server.renderToStaticMarkup(React.createElement(load(result.module, { document: { currentScript: { src: 'https://example.test/assets/app_styles_module.js?v=123' } } })));
    expect(external).toContain('href="https://example.test/assets/' + result.assets[0].file + '"');
    expect(external.indexOf('header.min-w-max')).toBeLessThan(external.indexOf('<link'));
    expect(external.indexOf('<link')).toBeLessThan(external.indexOf('font-size: 16px'));
  });
  it('uses cooked escaped selectors and leaves conditional/dynamic style expressions inline', () => {
    const fixture = 'const AppStyles = ({off=false,size=16}) => <>{off && <style>{`conditional`}</style>}<style>{`.hover\\\\:test {color:red}`}</style><style>{`body{font-size:${size}px}`}</style></>; window.AlloModules = {AppStyles:{AppStyles}};';
    const result = extractAppStyles(fixture, { minBytes: 1 });
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].content).toBe('.hover\\:test {color:red}');
    expect(result.module).toContain('conditional');
    expect(result.module).toContain('${size}');
  });
  it('rejects inline evaluation of the experimental URL-based variant', () => {
    expect(() => load(extractAppStyles(source).module, { document: { currentScript: null } })).toThrow('requires a script URL');
  });
  it('keeps the production module self-contained and generated mirrors current', () => {
    const generated = readFileSync('app_styles_module.js', 'utf8');
    expect(generated.replace(/\r\n/g, '\n')).toBe(buildAppStylesModule(source).replace(/\r\n/g, '\n'));
    expect(readFileSync('desktop/web-app/public/app_styles_module.js', 'utf8')).toBe(generated);
    expect(generated).not.toContain('__alloExternalStylesBase');
  });
});
