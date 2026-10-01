import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = process.cwd();
const launcher = readFileSync(resolve(ROOT, 'launch.html'), 'utf8');
const launcherMirror = readFileSync(resolve(ROOT, 'desktop/web-app/public/launch.html'), 'utf8');
const aiSetupSource = readFileSync(resolve(ROOT, 'view_misc_modals_source.jsx'), 'utf8');

function renderLauncher(url) {
  const virtualConsole = new VirtualConsole();
  return new JSDOM(launcher, {
    url,
    runScripts: 'dangerously',
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem('alloflow.launch.interstitialDismissed', '1');
      window.fetch = () => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          canvas_url: 'https://share.gemini.google/i3KFjQxCs1j1',
          version: '1.2',
        }),
      });
    },
  });
}

describe('launcher browser-app fallback', () => {
  it('offers account-free student access without crowding the default view', () => {
    const dom = new JSDOM(launcher);
    const document = dom.window.document;
    const section = document.querySelector('.browser-access');
    const details = section?.querySelector('details.ai-access-details');

    expect(section).toBeTruthy();
    expect(section.getAttribute('aria-labelledby')).toBe('browser-access-title');
    expect(document.querySelector('#browser-access-title')?.textContent).toContain('Google Education or Gemini');
    expect(section.textContent).toContain('join a session or open a shared AlloFlow file');
    expect(section.textContent).toContain('No Google account or AI key is required');
    expect(section.textContent).toContain('AI is optional');
    expect(details).toBeTruthy();
    expect(details.hasAttribute('open')).toBe(false);
    expect(details.querySelector('summary')?.textContent).toContain('optional AI access for contributors');

    const browserLink = document.querySelector('#browser-app-btn');
    expect(browserLink?.getAttribute('href')).toBe('https://alloflow-cdn.pages.dev/app/');
    expect(browserLink?.getAttribute('target')).toBe('_blank');
    expect(new Set((browserLink?.getAttribute('rel') || '').split(/\s+/))).toEqual(new Set(['noopener', 'noreferrer']));
    expect(details.querySelector('a[href="https://aistudio.google.com/apikey"]')).toBeTruthy();
    expect(details.querySelector('a[href="https://ai.google.dev/gemini-api/docs/pricing"]')).toBeTruthy();
    dom.window.close();
  });

  it('preserves tool, student-join, AI-policy, and shared-file handoffs', () => {
    const dom = renderLauncher(
      'https://apomera.github.io/AlloFlow/launch.html?tool=waterCycle&allo_join=ABC123&allo_ai=off#allo_pack=0.shared-payload',
    );
    const target = new URL(dom.window.document.querySelector('#browser-app-btn').href);

    expect(target.origin).toBe('https://alloflow-cdn.pages.dev');
    expect(target.pathname).toBe('/app/');
    expect(target.searchParams.get('tool')).toBe('waterCycle');
    expect(target.searchParams.get('allo_join')).toBe('ABC123');
    expect(target.searchParams.get('allo_ai')).toBe('off');
    expect(target.searchParams.has('allo_pack')).toBe(false);
    expect(target.hash).toBe('#allo_pack=0.shared-payload');
    dom.window.close();
  });

  it('points to the existing guided contributor-key instructions', () => {
    expect(aiSetupSource).toContain('https://aistudio.google.com/apikey');
    expect(aiSetupSource).toContain("'Press \"Create API key\" and copy it.'");
    expect(aiSetupSource).toContain('ai_backend.guided_card_gemini');
  });

  it('keeps the deploy-source mirror byte-identical', () => {
    expect(launcherMirror).toBe(launcher);
  });
});
