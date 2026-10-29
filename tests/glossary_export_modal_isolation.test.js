import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

beforeAll(() => { new Function(readFileSync('export_module.js', 'utf8'))(); });

const close = () => document.querySelector('.agx-dialog')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
afterEach(async () => {
  close();
  document.body.replaceChildren();
  await new Promise(resolve => setTimeout(resolve, 0));
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('style');
});

function open() {
  document.body.innerHTML = '<main id="page"><button id="opener">Export</button></main><aside id="already-inert" inert="inert">Background</aside>';
  const opener = document.querySelector('#opener'); opener.focus();
  const api = window.AlloModules.createExport({
    liveRef: { current: { generatedContent: { type: 'glossary', title: 'Words', data: [{ term: 'Leaf', def: 'A plant part.' }] }, t: key => key } },
    escapeXml: String,
  });
  api.handleExportGlossaryFile('chooser', { opener });
  return { opener, api };
}

describe('word-list export modal isolation', () => {
  it('isolates background controls and restores existing host modal locks on close', () => {
    document.documentElement.style.setProperty('overflow-y', 'scroll', 'important');
    document.body.style.setProperty('overflow', 'hidden');
    const { opener } = open();
    expect(document.querySelector('#page').hasAttribute('inert')).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.getPropertyPriority('overflow')).toBe('important');
    close();
    expect(document.querySelector('#page').hasAttribute('inert')).toBe(false);
    expect(document.querySelector('#already-inert').getAttribute('inert')).toBe('inert');
    expect(document.documentElement.style.getPropertyValue('overflow-y')).toBe('scroll');
    expect(document.documentElement.style.getPropertyPriority('overflow-y')).toBe('important');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.getPropertyPriority('overflow')).toBe('');
    expect(document.activeElement).toBe(opener);
  });

  it('keeps isolation through chooser, Quizlet and Back and restores the original opener', () => {
    const { opener } = open();
    const quizlet = document.querySelector('input[value="quizlet"]');
    quizlet.checked = true; quizlet.dispatchEvent(new Event('change'));
    document.querySelector('.agx-btn-primary').click();
    expect(document.querySelector('.agx-dialog h2').textContent).toBe('Copy for Quizlet');
    expect(document.querySelector('#page').hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    [...document.querySelectorAll('.agx-dialog button')].find(button => button.textContent === 'Back to export options').click();
    expect(document.querySelector('.agx-dialog h2').textContent).toBe('Export word list');
    expect(document.querySelector('#page').hasAttribute('inert')).toBe(true);
    close();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.getPropertyValue('overflow')).toBe('');
    expect(document.documentElement.style.getPropertyValue('overflow')).toBe('');
  });

  it('releases background state after host teardown removes the overlay', async () => {
    open();
    document.querySelector('.agx-overlay').remove();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.querySelector('#page').hasAttribute('inert')).toBe(false);
    expect(document.querySelector('#already-inert').getAttribute('inert')).toBe('inert');
    expect(document.body.style.getPropertyValue('overflow')).toBe('');
    expect(document.documentElement.style.getPropertyValue('overflow')).toBe('');
  });

  it('does not pass its Tab handling to a parent dialog keyboard trap', () => {
    open();
    let reachedHost = false;
    const handler = event => { if (event.key === 'Tab') reachedHost = true; };
    document.addEventListener('keydown', handler);
    document.querySelector('.agx-dialog input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    document.removeEventListener('keydown', handler);
    expect(reachedHost).toBe(false);
  });
});
