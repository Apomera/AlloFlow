import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMServer = require(resolve(modulesDir, 'react-dom/server'));

let config;

beforeAll(() => {
  window.StemLab = { registerTool: (_id, cfg) => { config = cfg; } };
  globalThis.StemLab = window.StemLab;
  for (const file of ['stem_lumen_evidence.js', 'stem_lumen_documents.js', 'stem_lumen_study.js', 'stem_tool_lumen.js']) {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab', file), 'utf8');
    // Browser scripts intentionally expose globals instead of using imports.
    // eslint-disable-next-line no-new-func
    new Function(source)();
  }
});

function render(toolData, extras = {}) {
  const ctx = {
    React,
    toolData: { lumen: toolData },
    update: () => {},
    setToolData: () => {},
    announceToSR: () => {},
    ...extras
  };
  return ReactDOMServer.renderToStaticMarkup(config.render(ctx));
}

describe('Lumen evidence-workspace modes', () => {
  it('opens to a coherent workspace chooser', () => {
    const html = render({ mode: 'home' }, { sourceText: 'A current source is loaded.' });
    expect(html).toContain('Study Sources');
    expect(html).toContain('Analyze Data');
    expect(html).toContain('Conduct Inquiry');
    expect(html).toContain('Current AlloFlow source available');
  });

  it('renders Study Sources with the current AlloFlow source already chunked', () => {
    const html = render({ mode: 'study' }, {
      sourceText: '# Weather\n\nWarm air can hold more water vapor than cold air.\n\nCondensation occurs as saturated air cools.',
      sourceTopic: 'Weather systems',
      gradeLevel: '6th Grade',
      isTeacherMode: false,
      studentNickname: 'Learner'
    });
    expect(html).toContain('Study Sources');
    expect(html).toContain('Weather systems');
    expect(html).toContain('evidence passage');
    expect(html).toContain('What do you want to understand?');
    expect(html).toContain('Find grounded answer');
  });

  it('keeps the existing quantitative workspace behind Analyze Data mode', () => {
    const html = render({ mode: 'data' });
    expect(html).toContain('Analyze Data');
    expect(html).toContain('Switch to Study Sources');
    // Wave-era onboarding CTA (the stale pre-wave base said 'Use sample data').
    expect(html).toContain('Try a sample');
  });
});
