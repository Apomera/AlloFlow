// School Rewards portal translation layer (2026-09-02).
//
// The portal was English-only. The layer is a dictionary keyed by the English
// text, applied to text nodes and label attributes under <main> and re-applied
// by a MutationObserver after every render, with numeric strings matched by
// pattern. It is sliced out of Portal.html between SR_I18N_START/END markers
// and run against a jsdom fixture here, so the behaviour is tested rather than
// pinned.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PORTAL = readFileSync(resolve(process.cwd(), 'apps_script/school_rewards/Portal.html'), 'utf8');
const BLOCK = PORTAL.slice(PORTAL.indexOf('/* SR_I18N_START */'), PORTAL.indexOf('/* SR_I18N_END */'));

function fixture(html) {
  document.body.innerHTML = `<main class="shell"><div class="top"><h1 id="school-title">School Rewards</h1><select id="lang-select"><option value="en">English</option><option value="es">Español</option></select></div>${html}</main>`;
  // eslint-disable-next-line no-new-func
  new Function(BLOCK)();
  return window.srI18n;
}

beforeEach(() => { localStorage.clear(); Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true }); });
afterEach(() => { delete window.srI18n; document.body.innerHTML = ''; });

describe('saved language (2026-09-02)', () => {
  it('adopts the language the repository saved for a student when this device has no choice yet, and the device choice wins otherwise', () => {
    const i18n = fixture('<div id="metric-students-label">My available-to-spend balance</div>');
    i18n.adopt('es');
    expect(i18n.language()).toBe('es');
    expect(document.getElementById('metric-students-label').textContent).toBe('Mi saldo disponible para gastar');
    // Adopting is quiet: it must not write the student's choice back to the ledger.
    expect(localStorage.getItem('alloflow_school_rewards_lang')).toBe('es');
    delete window.srI18n; document.body.innerHTML = '';
    localStorage.setItem('alloflow_school_rewards_lang', 'en');
    const again = fixture('<div id="metric-students-label">My available-to-spend balance</div>');
    again.adopt('es');
    expect(again.language()).toBe('en');
    expect(document.getElementById('metric-students-label').textContent).toBe('My available-to-spend balance');
    again.adopt('xx');
    expect(again.language()).toBe('en');
  });

  it('a signed-in student choosing from the menu saves the choice to the repository; adopting and other roles do not', () => {
    const calls = [];
    window.rpc = (name, payload) => { calls.push([name, payload]); return Promise.resolve({ ok: true }); };
    window.state = { data: { actor: { role: 'student' } } };
    const i18n = fixture('<div id="metric-students-label">My available-to-spend balance</div>');
    i18n.setLanguage('es');
    expect(calls).toEqual([['setSchoolRewardsLanguage', { language: 'es' }]]);
    i18n.adopt('en');
    expect(calls).toHaveLength(1);
    window.state = { data: { actor: { role: 'staff' } } };
    i18n.setLanguage('en');
    expect(calls).toHaveLength(1);
    delete window.rpc; delete window.state;
  });
});

describe('portal translation layer', () => {
  it('translates rendered text, attributes, and numeric patterns, and restores English losslessly', async () => {
    const i18n = fixture('<div id="metric-students-label">My available-to-spend balance</div><div id="pts">42 pts</div><p id="need">38 more points needed</p><input id="search" placeholder="Robotics kit hour" aria-label="Search students"><button id="goal" aria-label="Save for Robotics kit hour">Save for this</button>');
    expect(i18n.language()).toBe('en');
    i18n.setLanguage('es');
    expect(document.getElementById('metric-students-label').textContent).toBe('Mi saldo disponible para gastar');
    expect(document.getElementById('school-title').textContent).toBe('Recompensas Escolares');
    expect(document.getElementById('pts').textContent).toBe('42 pts');
    expect(document.getElementById('need').textContent).toBe('Faltan 38 puntos');
    expect(document.getElementById('goal').textContent).toBe('Ahorrar para esto');
    expect(document.getElementById('goal').getAttribute('aria-label')).toBe('Ahorrar para Robotics kit hour');
    // School-entered content is never translated: prize names, category names
    // and rosters belong to the school, so they pass through untouched.
    expect(document.getElementById('search').getAttribute('placeholder')).toBe('Robotics kit hour');
    expect(document.documentElement.lang).toBe('es');
    expect(localStorage.getItem('alloflow_school_rewards_lang')).toBe('es');
    // The language menu itself is never translated.
    expect(document.querySelector('#lang-select option[value="en"]').textContent).toBe('English');
    i18n.setLanguage('en');
    expect(document.getElementById('metric-students-label').textContent).toBe('My available-to-spend balance');
    expect(document.getElementById('need').textContent).toBe('38 more points needed');
    expect(document.getElementById('goal').getAttribute('aria-label')).toBe('Save for Robotics kit hour');
  });

  it('re-applies after a render replaces the DOM, and follows a changed English source', async () => {
    const i18n = fixture('<div id="preview-catalog"></div>');
    i18n.setLanguage('es');
    document.getElementById('preview-catalog').innerHTML = '<article class="prize"><p class="affordability">Within your balance</p><button type="button">Save for this</button></article>';
    await new Promise((res) => setTimeout(res, 20));
    expect(document.querySelector('.affordability').textContent).toBe('Dentro de tu saldo');
    expect(document.querySelector('.prize button').textContent).toBe('Ahorrar para esto');
    // A later render changes the English text: the layer translates the new value.
    document.querySelector('.affordability').textContent = '12 more points needed';
    await new Promise((res) => setTimeout(res, 20));
    expect(document.querySelector('.affordability').textContent).toBe('Faltan 12 puntos');
  });

  it('defaults to the device language when no choice is stored', () => {
    Object.defineProperty(navigator, 'language', { value: 'es-MX', configurable: true });
    const i18n = fixture('<div id="x">Overview</div>');
    expect(i18n.language()).toBe('es');
    expect(document.getElementById('x').textContent).toBe('Resumen');
    expect(document.getElementById('lang-select').value).toBe('es');
  });

  it('covers every student-facing static string in the portal markup', () => {
    const markup = PORTAL.slice(PORTAL.indexOf('<main class="shell">'), PORTAL.indexOf('<script>'));
    const dashboard = markup.slice(markup.indexOf('id="panel-dashboard"'), markup.indexOf('id="panel-award"'));
    const texts = Array.from(dashboard.matchAll(/>([^<>]{3,})</g), (m) => m[1].trim().replace(/&amp;/g, '&')).filter((t) => /[A-Za-z]{3}/.test(t) && !/^[—…]+$/.test(t));
    const i18n = fixture('');
    const missing = texts.filter((t) => !i18n.translate(t, 'es'));
    expect(missing).toEqual([]);
  });
});
