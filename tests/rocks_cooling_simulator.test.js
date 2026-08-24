// Magma cooling and crystallization learning model.
//
// The model must do more than animate a small box: it should make the causal
// chain visible (cooling environment -> time for atoms -> crystal size/texture)
// and let a learner compare the model with the specimen currently in hand.

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const PUBLIC_FILE = 'desktop/web-app/public/stem_lab/stem_tool_rocks.js';

function render(speed = 'slow', progress = 0, active = false) {
  const store = {
    rocks: {
      mode: 'rocks',
      selectedRock: 'granite',
      coolingSpeed: speed,
      coolingProgress: progress,
      coolingAnimActive: active,
    },
    rockCycle: {},
  };
  const ctx = makeCtx({ toolData: store, setToolData: () => {} });
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(() => window.StemLab._registry.rocks.render(ctx))
  );
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('magma cooling model — visual scale and context', () => {
  it('keeps the source and deploy mirror identical', () => {
    expect(readFileSync(ROCKS_FILE, 'utf8')).toBe(readFileSync(PUBLIC_FILE, 'utf8'));
  });

  it('uses a materially larger, high-resolution science diagram', () => {
    const markup = render();
    const canvas = /<canvas\b[^>]*>/.exec(markup)?.[0] || '';
    expect(canvas).toContain('max-width:380px');
    expect(canvas).toContain('aspect-ratio:16 / 10');

    const source = readFileSync(ROCKS_FILE, 'utf8');
    expect(source).toContain('var W = 360, H = 225;');
    expect(source).toContain('var atomI = 0; atomI < 54; atomI++');
    expect(source).toContain("currentSpeed.visual");
  });

  it('explains the model variable, specimen context, and why the evidence matters', () => {
    const markup = render();
    expect(markup).toContain('Change only the cooling rate');
    expect(markup).toContain('Current specimen:');
    expect(markup).toContain('stem.rocks.granite (coarse-grained)');
    expect(markup).toContain('Chemistry, dissolved gas, and eruption style');
    expect(markup).toContain('How to use this model');
    expect(markup).toContain('Choose a cooling history.');
    expect(markup).toContain('Run solidification and watch crystal size change.');
    expect(markup).toContain('Compare the predicted texture with the specimen and explain why.');
    expect(markup).toContain('<ol');
    expect(markup).toContain('Cooling history controls');
    expect(markup).toContain('Live solidification model');
    expect(markup).toContain('Time for atoms');
    expect(markup).toContain('Resulting texture');
    expect(markup).toContain('Why geologists care');
    expect(markup).toContain('Crystal size is a record of cooling history');
    expect(markup).toContain('Try Slow and Quenched back-to-back');
  });
});

describe('magma cooling model — comparative outcomes', () => {
  it.each([
    ['slow', 'Deep underground', 'Lots of time', 'large crystals visible to the eye', 'Granite or gabbro'],
    ['medium', 'Shallow underground intrusion', 'Some time to organize', 'Medium-grained', 'Diabase (dolerite)'],
    ['fast', 'near Earth', 'Little time to move', 'microscopic crystals', 'Basalt or rhyolite'],
    ['rapid', 'contact with water', 'Almost no time', 'no mineral crystals', 'Obsidian or volcanic glass'],
  ])('connects %s cooling to environment, atomic time, texture, and an example', (speed, where, atoms, texture, example) => {
    const markup = render(speed);
    [where, atoms, texture, example].forEach((text) => expect(markup).toContain(text));
  });

  it('makes the visible animation durations reflect the selected relative cooling rate', () => {
    const source = readFileSync(ROCKS_FILE, 'utf8');
    expect(source).toMatch(/id: 'slow'[\s\S]*?duration: 3200/);
    expect(source).toMatch(/id: 'medium'[\s\S]*?duration: 2400/);
    expect(source).toMatch(/id: 'fast'[\s\S]*?duration: 1500/);
    expect(source).toMatch(/id: 'rapid'[\s\S]*?duration: 800/);
    expect(source).toContain("prefers-reduced-motion: reduce");
  });

  it('exposes selected state, progress, and a meaningful completed result', () => {
    const ready = render('slow', 0, false);
    expect(ready).toContain('aria-pressed="true"');
    expect(ready).toContain('<progress');
    expect(ready).toContain('Solidification model progress');
    expect(ready).toContain('Ready to run: the model begins with molten magma.');

    const complete = render('rapid', 100, false);
    expect(complete).toContain('Model complete: Glassy; no mineral crystals.');
    expect(complete).toContain('Replay solidification');
    expect(complete).toContain('Glass — no crystals');
  });
});
