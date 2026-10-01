import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_applab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_applab.js');
const themePath = path.join(process.cwd(), 'app_styles_source.jsx');

function channel(value) {
  value /= 255;
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const parts = hex.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
  return (0.2126 * channel(parts[0])) + (0.7152 * channel(parts[1])) + (0.0722 * channel(parts[2]));
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function findButton(host, name) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === name);
}

describe('App Lab accessibility', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_applab.js', 'appLab');
    const Component = () => {
      const [toolData, setToolData] = React.useState({ appLab: {} });
      const ctx = makeCtx({
        toolData,
        setToolData,
        update: (toolId, key, value) => setToolData((previous) => ({
          ...previous,
          [toolId]: { ...(previous[toolId] || {}), [key]: value },
        })),
      });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('uses an AA contrast pair for shared disabled buttons', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const themes = fs.readFileSync(themePath, 'utf8');
    expect(source).toContain("background: dis ? 'var(--allo-stem-deeper, #e5e7eb)' :");
    expect(source).toContain("color: dis ? 'var(--allo-stem-text-soft, #4b5563)' :");
    expect(source).toContain("'aria-label': __alloT('stem.applab.hypothesis_input', 'Prompt variance hypothesis')");
    expect(source).toContain("'aria-label': __alloT('stem.applab.explanation_input', 'Prompt variance explanation')");
    [
      ['#475569', '#e2e8f0'], // default
      ['#94a3b8', '#020617'], // dark
      ['#ffff00', '#000000'], // high contrast
    ].forEach(([foreground, background]) => {
      expect(themes).toContain(`--allo-stem-text-soft:    ${foreground}`);
      expect(themes).toContain(`--allo-stem-deeper:       ${background}`);
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('renders the initially disabled Generate App control with theme-responsive colors', () => {
    const button = findButton(host, 'Generate app');
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(true);
    expect(button.style.background).toBe('var(--allo-stem-deeper, #e5e7eb)');
    expect(button.style.color).toBe('var(--allo-stem-text-soft, #4b5563)');
  });
});
