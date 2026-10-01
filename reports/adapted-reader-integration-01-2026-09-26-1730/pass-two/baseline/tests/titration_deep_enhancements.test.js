import fs from 'node:fs';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = 'stem_lab/stem_tool_titration.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_titration.js';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function renderState(state = {}) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('titrationLab', {
    titrationLab: Object.assign({ safetyChecked: true, labTab: 'titrate' }, state),
  });
  return host;
}

function exactText(root, text) {
  return [...root.querySelectorAll('*')].find((el) => el.children.length === 0
    && el.textContent.trim().toLowerCase() === text.toLowerCase());
}

function numberFrom(text) {
  const match = String(text).replaceAll(',', '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

function hasAtLeast44Px(className, axis) {
  const classes = String(className || '').split(/\s+/);
  if (classes.includes('size-11') || classes.includes('size-12')) return true;
  if (classes.includes(axis + '-11') || classes.includes(axis + '-12')) return true;
  if (classes.includes('min-' + axis + '-11') || classes.includes('min-' + axis + '-12')) return true;
  return classes.some((name) => {
    const match = name.match(new RegExp('^(?:min-)?' + axis + '-\\[(\\d+(?:\\.\\d+)?)(px|rem)\\]$'));
    if (!match) return false;
    const pixels = match[2] === 'rem' ? Number(match[1]) * 16 : Number(match[1]);
    return pixels >= 44;
  });
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'titrationLab');
});

describe('Titration Lab deep safety and science regressions', () => {
  it('does not teach an invented 10-second eyewash rule or tell students to fight a fire with PASS', () => {
    const source = read(sourcePath);
    expect(source).not.toMatch(/10[- ]second rule/i);
    expect(source).not.toMatch(/approximately 10 seconds to reach the eyewash/i);
    expect(source).not.toMatch(/P\.\s*A\.\s*S\.\s*S\.?:\s*Pull/i);
    expect(source).not.toMatch(/Pull the pin,?\s*Aim at (?:the )?base/i);
    expect(source).toMatch(/rins(?:e|ing)[^.\n]{0,80}(?:at least\s*)?15\+?\s*(?:min|minutes)/i);
  });

  it('defines the self-indicating permanganate endpoint as a faint pink that persists after swirling', () => {
    const source = read(sourcePath);
    const start = source.indexOf('redoxWarning:');
    const end = source.indexOf('polyprotic:', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const warning = source.slice(start, end);

    expect(warning).not.toMatch(/purple\s*(?:\\u2192|→|->)\s*colou?rless\s*=\s*endpoint/i);
    expect(warning).toMatch(/faint\s+(?:lasting|persistent)?\s*pink/i);
    expect(warning).toMatch(/persist/i);
    expect(warning).toMatch(/swirl/i);
  });
});

describe('Titration Lab safety-gate controls', () => {
  it('exposes PPE completion as a progressbar and each PPE card as a toggle', () => {
    const root = renderState({
      safetyChecked: false,
      safetyChecks: { goggles: true, gloves: false, coat: false, shoes: false },
    });
    const progress = root.querySelector('[role="progressbar"]');
    expect(progress).not.toBeNull();
    expect(progress.getAttribute('aria-label')).toMatch(/PPE|protect/i);
    expect(Number(progress.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    expect(Number(progress.getAttribute('aria-valuemax')))
      .toBeGreaterThan(Number(progress.getAttribute('aria-valuenow')));

    const ppeButtons = [...root.querySelectorAll('button[aria-describedby^="titration-ppe-desc-"]')];
    expect(ppeButtons).toHaveLength(4);
    expect(ppeButtons.map((button) => button.getAttribute('aria-pressed')))
      .toEqual(['true', 'false', 'false', 'false']);
  });

  it('connects the persistent Safety Info and Hazards toggles to expanded panels', () => {
    const root = renderState({ showSafetyRef: true, showHazards: true });
    for (const name of ['Safety Info', 'Hazards']) {
      const button = [...root.querySelectorAll('button')]
        .find((candidate) => candidate.getAttribute('aria-label') === name);
      expect(button, name + ' toggle').not.toBeUndefined();
      expect(button.getAttribute('aria-expanded')).toBe('true');
      const controlledId = button.getAttribute('aria-controls');
      expect(controlledId).toBeTruthy();
      expect(root.querySelector('#' + controlledId), name + ' controlled panel').not.toBeNull();
    }
  });
});

describe('Titration Lab responsive experiment workspace', () => {
  it('lays out the six main tabs as a responsive grid', () => {
    const root = renderState();
    const tablist = [...root.querySelectorAll('[role="tablist"]')]
      .find((candidate) => candidate.querySelectorAll('[role="tab"]').length === 6);
    expect(tablist).not.toBeUndefined();
    const classes = tablist.className;
    expect(classes).toMatch(/(?:^|\s)grid(?:\s|$)/);
    expect(classes).toMatch(/(?:^|\s)grid-cols-2(?:\s|$)/);
    expect(classes).toMatch(/(?:^|\s)(?:sm|md):grid-cols-3(?:\s|$)/);
    expect(classes).toMatch(/(?:^|\s)(?:lg|xl):grid-cols-6(?:\s|$)/);
  });

  it('reflows the primary SVG curve on phones and supplies a visible legend', () => {
    const root = renderState({ presetId: 'sa_sb' });
    const curve = [...root.querySelectorAll('svg[role="img"]')]
      .find((svg) => /^Titration curve for /i.test(svg.getAttribute('aria-label') || ''));
    expect(curve).not.toBeUndefined();

    expect(curve.className.baseVal).toMatch(/(?:^|\s)w-full(?:\s|$)/);
    expect(curve.className.baseVal).toMatch(/(?:^|\s)h-auto(?:\s|$)/);
    expect(curve.className.baseVal).toMatch(/min-w-\[(?:560|600)px\]/);
    const scroll = curve.closest('.overflow-x-auto');
    expect(scroll).not.toBeNull();
    expect(scroll.getAttribute('role')).toBe('region');
    expect(scroll.getAttribute('tabindex')).toBe('0');

    const legend = [...root.querySelectorAll('[aria-label]')]
      .find((el) => /titration curve legend/i.test(el.getAttribute('aria-label') || ''));
    expect(legend, 'visible, named curve legend').not.toBeUndefined();
    expect(legend.textContent).toMatch(/current|observed|active/i);
    expect(legend.textContent).toMatch(/preview|predicted|full curve/i);
    expect(legend.textContent).toMatch(/equivalence/i);
  });
});

describe('Titration Lab incident feedback', () => {
  it('gives every incident selector a 44 by 44 CSS-pixel target', () => {
    const root = renderState({ labTab: 'incidents', incidentIdx: 0 });
    const selectors = [...root.querySelectorAll('button[aria-label^="Select incident scenario:"]')];
    expect(selectors.length).toBeGreaterThan(3);
    for (const button of selectors) {
      expect(hasAtLeast44Px(button.className, 'w'), button.outerHTML).toBe(true);
      expect(hasAtLeast44Px(button.className, 'h'), button.outerHTML).toBe(true);
    }
  });

  it('announces incident feedback through a live region', () => {
    const root = renderState({ labTab: 'incidents', incidentIdx: 0, incidentAnswer: 'wipe' });
    const feedbackText = [...root.querySelectorAll('p')]
      .find((p) => /Wiping can spread the acid/i.test(p.textContent));
    expect(feedbackText).not.toBeUndefined();
    const liveRegion = feedbackText.closest('[role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]');
    expect(liveRegion).not.toBeNull();
  });
});

describe('Titration Lab contextual animation', () => {
  it('renders the snapshot and teaching animation only on the Titrate tab', () => {
    const titrate = renderState({ labTab: 'titrate' });
    expect(titrate.querySelector('[data-titration-anim="true"]')).not.toBeNull();
    expect(titrate.querySelector('button[aria-label="Save titration snapshot"]')).not.toBeNull();

    for (const labTab of ['challenge', 'incidents', 'equipment', 'molarity', 'buffers']) {
      const other = renderState({ labTab });
      expect(other.querySelector('[data-titration-anim="true"]'), labTab + ' animation').toBeNull();
      expect(other.querySelector('button[aria-label="Save titration snapshot"]'), labTab + ' snapshot').toBeNull();
    }
  });

  it('offers a named pause control for the animated curve', () => {
    const root = renderState({ labTab: 'titrate' });
    const pause = [...root.querySelectorAll('button')].find((button) => {
      const name = (button.getAttribute('aria-label') || '') + ' ' + button.textContent;
      return /pause/i.test(name) && /curve|animation/i.test(name);
    });
    expect(pause).not.toBeUndefined();
    expect(pause.getAttribute('aria-pressed')).toMatch(/^(?:true|false)$/);
    expect(pause.getAttribute('type')).toBe('button');
  });
});

describe('Titration Lab dilution calculator constraints', () => {
  it('stacks calculator inputs on phones and expands them at the small breakpoint', () => {
    const root = renderState({ labTab: 'molarity' });
    const stockHeading = exactText(root, 'Stock Solution');
    expect(stockHeading).not.toBeUndefined();
    const inputGrid = stockHeading.parentElement.parentElement;
    expect(inputGrid.className).toMatch(/(?:^|\s)grid-cols-1(?:\s|$)/);
    expect(inputGrid.className).toMatch(/(?:^|\s)sm:grid-cols-2(?:\s|$)/);

    const diluentHeading = exactText(root, 'Diluent');
    expect(diluentHeading).not.toBeUndefined();
    const summaryGrid = diluentHeading.parentElement.parentElement;
    expect(summaryGrid.className).toMatch(/(?:^|\s)grid(?:\s|$)/);
    expect(summaryGrid.className).toMatch(/(?:^|\s)grid-cols-1(?:\s|$)/);
    expect(summaryGrid.className).toMatch(/(?:^|\s)sm:grid-cols-3(?:\s|$)/);
  });

  it('uses the clamped target concentration in every derived result', () => {
    const stockM = 0.1;
    const finalMl = 100;
    const root = renderState({
      labTab: 'molarity',
      molarityC1: stockM,
      molarityC2: 1.0,
      molarityV1: finalMl,
    });

    const targetInput = root.querySelector('input[aria-label="Target concentration"]');
    expect(targetInput).not.toBeNull();
    expect(Number(targetInput.getAttribute('value'))).toBeLessThanOrEqual(stockM);
    const targetDisplay = numberFrom(targetInput.parentElement.textContent);
    expect(targetDisplay).toBeLessThanOrEqual(stockM);

    const volumeLabel = [...root.querySelectorAll('span')]
      .find((span) => /Volume needed/i.test(span.textContent));
    expect(volumeLabel).not.toBeUndefined();
    const stockVolumeMl = numberFrom(volumeLabel.parentElement.textContent);
    expect(stockVolumeMl).toBeGreaterThanOrEqual(0);
    expect(stockVolumeMl).toBeLessThanOrEqual(finalMl);

    const diluentHeading = exactText(root, 'Diluent');
    expect(diluentHeading).not.toBeUndefined();
    expect(diluentHeading.parentElement.textContent).toMatch(/add to the final mark/i);
    expect(root.textContent).toMatch(/limited to 0\.100 M/i);
    expect(root.textContent).not.toMatch(/-\d+(?:\.\d+)?\s*mL/i);
  });
});

describe('Titration Lab deployment parity', () => {
  it('keeps the canonical source and deploy mirror byte-identical', () => {
    const source = read(sourcePath);
    const mirror = read(publicPath);
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });
});
