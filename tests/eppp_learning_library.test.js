import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('EPPP learning-library shared interactions', () => {
  const source = read('test_prep/eppp_legacy/js/textbook_renderer.js');

  it('provides keyboard-operable chapter, case, and section progress controls', () => {
    expect(source).toContain('class="chapter-header" aria-expanded="false"');
    expect(source).toContain('class="case-header" aria-expanded="false"');
    expect(source).toContain('data-section-complete');
    expect(source).toContain('alloflow_eppp_textbook_progress_v1');
    expect(source).toContain("role=\"status\" aria-live=\"polite\"");
  });

  it('gives diagrams accessible alternatives and learner-controlled motion', () => {
    expect(source).toContain('role="img" aria-label="');
    expect(source).toContain('diagram-text-alternative');
    expect(source).toContain('data-textbook-action="diagrams"');
    expect(source).toContain('data-textbook-action="motion"');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('.textbook-container.reduce-motion .interactive-diagram * { animation:none !important;transition:none !important; }');
    expect(source).toContain('.interactive-diagram * { animation:none !important;transition:none !important; }');
  });

  it('progressively reveals diagrams with native keyboard controls and visible state', () => {
    expect(source).toContain('aria-label="Guided diagram reveal controls" hidden');
    expect(source).toContain('data-diagram-action="toggle" aria-pressed="false"');
    expect(source).toContain('data-diagram-action="previous"');
    expect(source).toContain('data-diagram-action="next"');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain("figure.dataset.diagramStep = guided ? String(step + 1) : 'complete'");
    expect(source).toContain("toggleButton.setAttribute('aria-pressed', String(guided))");
  });

  it('keeps the full diagram and text alternative as the no-JavaScript default', () => {
    expect(source).toContain('class="diagram-visual" id="');
    expect(source).toContain('class="diagram-caption" id="');
    expect(source).toContain('class="diagram-text-alternative" id="');
    expect(source).not.toContain('class="diagram-visual" hidden');
    expect(source).not.toContain('class="diagram-caption" hidden');
    expect(source).not.toContain('class="diagram-text-alternative" hidden');
    expect(source).toContain('controls.hidden = false');
    expect(source.indexOf('class="diagram-caption" id="')).toBeGreaterThan(source.indexOf('class="diagram-study-controls"'));
  });

  it('runs the guided reveal through preview, visual, explanation, and complete states', () => {
    document.body.innerHTML = '<div id="diagram-test-root"></div>';
    localStorage.clear();
    window.TextbookChapters = [{
      id: 'ch-test',
      title: 'Interaction fixture',
      domain: 'Fixture domain',
      examWeight: 'Fixture weight',
      references: [],
      sections: [{
        heading: 'Diagram fixture',
        content: '<p>Fixture content.</p>',
        interactiveDiagram: {
          svg: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"></circle></svg>',
          description: 'A fixture diagram with an accessible explanation.',
        },
      }],
    }];
    const runRenderer = new Function('window', 'document', 'localStorage', 'setTimeout', 'clearTimeout', source);
    runRenderer(window, document, localStorage, setTimeout, clearTimeout);
    window.renderTextbook('diagram-test-root');

    const figure = document.querySelector('.interactive-diagram');
    const visual = figure.querySelector('.diagram-visual');
    const caption = figure.querySelector('.diagram-caption');
    const alternative = figure.querySelector('.diagram-text-alternative');
    const controls = figure.querySelector('.diagram-study-controls');
    const toggle = controls.querySelector('[data-diagram-action="toggle"]');
    const previous = controls.querySelector('[data-diagram-action="previous"]');
    const next = controls.querySelector('[data-diagram-action="next"]');

    expect(figure.lastElementChild).toBe(caption);
    expect(controls.hidden).toBe(false);
    expect(figure.dataset.diagramStep).toBe('complete');
    expect([visual, caption, alternative].every((element) => !element.hidden)).toBe(true);
    expect(toggle.getAttribute('aria-controls').split(' ').every((id) => document.getElementById(id))).toBe(true);

    toggle.click();
    expect(toggle).toMatchObject({ tagName: 'BUTTON' });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(figure.dataset.diagramStep).toBe('1');
    expect([visual.hidden, caption.hidden, alternative.hidden, previous.disabled, next.disabled]).toEqual([true, true, true, true, false]);

    next.click();
    expect(figure.dataset.diagramStep).toBe('2');
    expect([visual.hidden, caption.hidden, alternative.hidden, previous.disabled, next.disabled]).toEqual([false, true, true, false, false]);

    next.click();
    expect(figure.dataset.diagramStep).toBe('3');
    expect([visual.hidden, caption.hidden, alternative.hidden, previous.disabled, next.disabled]).toEqual([false, false, false, false, true]);

    toggle.click();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(figure.dataset.diagramStep).toBe('complete');
    expect([visual, caption, alternative].every((element) => !element.hidden)).toBe(true);
  });

  it('keeps the deployed renderer byte-identical', () => {
    expect(read('desktop/web-app/public/test_prep/eppp_legacy/js/textbook_renderer.js')).toBe(source);
  });
});
