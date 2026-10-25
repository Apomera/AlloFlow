import { describe, expect, it } from 'vitest';
const { themedPortalCalls } = require('../dev-tools/portal_theme_scope.cjs');

describe('portal root theme detection', () => {
  it.each([
    'React.createElement("div", {className: "fixed theme-" + theme}, child)',
    '<div className={`fixed theme-${theme}`}><span>{child}</span></div>',
    'React.createElement("div", {className: "theme-" + (theme || "light")}, child)',
  ])('recognizes the actual root class: %s', root => {
    const src = `function panel(theme, child) { return ReactDOM.createPortal(${root}, document.body); }`;
    expect(themedPortalCalls(src)).toHaveLength(1);
  });

  it('resolves the same scoped local bindings for both screener branches', () => {
    expect(themedPortalCalls(`function panel(theme, complete) {
      const h = React.createElement;
      const shell = "fixed theme-" + (theme || "light");
      let overlay;
      if (complete) overlay = h("div", {className: shell}, "Done");
      else overlay = h("div", {className: shell}, "Next");
      return ReactDOM.createPortal(overlay, document.body);
    }`)).toHaveLength(1);
  });

  it.each([
    'const overlay = <div><span className={`theme-${theme}`}/></div>;',
    'let overlay = <div className={`theme-${theme}`}/>; overlay = <div/>;',
    'let overlay; if (ready) overlay = <div className={`theme-${theme}`}/>; else overlay = <div/>;',
    'const overlay = <div className={`theme-${theme}`} {...props}/>;',
    'const overlay = <Custom className={`theme-${theme}`}/>;',
    'const overlay = <div className="theme-dark"/>;',
    'const shell = "theme-" + theme; const overlay = <div title={shell}/>;',
    'let shell = "theme-" + theme; shell = "fixed"; const overlay = <div className={shell}/>;',
    'const h = customFactory; const overlay = h("div", {className: "theme-" + theme});',
    'const overlay = React.createElement("div", {...props, className: "theme-" + theme});',
    'const overlay = React.createElement("div", {className: "theme-" + theme, className: "fixed"});',
    'const overlay = unknown;',
  ])('keeps an unproven root flagged: %s', setup => {
    expect(themedPortalCalls(`function panel(theme, props, ready) { ${setup} return ReactDOM.createPortal(overlay, document.body); }`)).toEqual([]);
  });

  it('does not borrow a similarly named theme class from another scope', () => {
    expect(themedPortalCalls('const shell = "theme-" + theme; function panel(shell) { const overlay = <div className={shell}/>; return ReactDOM.createPortal(overlay, document.body); }')).toEqual([]);
  });
  it('does not suppress findings when the source cannot be parsed', () => {
    expect(themedPortalCalls('function broken( { ReactDOM.createPortal(overlay, document.body);')).toEqual([]);
  });
});
