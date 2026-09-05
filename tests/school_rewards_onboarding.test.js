import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { webcrypto } from 'node:crypto';

const page = readFileSync('school-rewards-practice.html', 'utf8');
const opened = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
afterEach(() => opened.splice(0).forEach(dom => dom.window.close()));

async function openPractice(role = 'staff', prepare) {
  const errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(page, { url: 'https://school.example/practice', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  opened.push(dom);
  const w = dom.window, doc = w.document;
  Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.TextEncoder = TextEncoder;
  w.HTMLElement.prototype.scrollIntoView = function() {};
  w.localStorage.setItem('alloflow_school_rewards_practice_role', role);
  w.confirm = () => true;
  w.print = () => {};
  const scripts = [...doc.querySelectorAll('script')];
  w.eval(scripts[0].textContent);
  if (prepare) prepare(w.srPractice.repo());
  scripts.slice(1).forEach(script => w.eval(script.textContent));
  for (let i = 0; i < 100 && !doc.querySelector('#actor-pill').textContent.includes(role.toUpperCase()); i++) await pause(20);
  // Bootstrap and any dependent language-pack response must finish before assertions.
  await pause(180);
  expect(errors).toEqual([]);
  return { w, doc, $: selector => doc.querySelector(selector) };
}

describe('School Rewards onboarding in the complete practice page', () => {
  it('keeps optional customization hidden and the opening overview still until a tour is requested', async () => {
    const app = await openPractice();
    expect(app.w.getComputedStyle(app.$('#practice-panel')).display).toBe('none');
    expect(app.$('#practice-customize').getAttribute('aria-expanded')).toBe('false');
    app.$('#practice-customize').click();
    expect(app.w.getComputedStyle(app.$('#practice-panel')).display).toBe('grid');
    expect(app.$('#practice-customize').getAttribute('aria-expanded')).toBe('true');
    app.$('#practice-customize').click();
    expect(app.w.getComputedStyle(app.$('#practice-panel')).display).toBe('none');
    await pause(950);
    expect(app.$('.tour-box')).toBeNull();
    expect(app.$('[data-tab="dashboard"]').getAttribute('aria-selected')).toBe('true');
    app.$('#practice-guide').click();
    expect(app.$('#practice-demo-guide').open).toBe(true);
    expect(app.doc.activeElement).toBe(app.$('#practice-demo-guide summary'));
  });

  it('expands a collapsed admin section before navigating and puts keyboard focus on its heading', async () => {
    const app = await openPractice('admin');
    app.$('[data-tab="admin"]').click();
    const card = app.$('#student-form').closest('article.card');
    expect(card.classList.contains('collapsed')).toBe(true);
    expect(app.$('#checklist-card').classList.contains('collapsed')).toBe(false);
    expect(app.$('#settings-card').classList.contains('collapsed')).toBe(false);
    app.$('.admin-index a[href="#' + card.id + '"]').click();
    expect(card.classList.contains('collapsed')).toBe(false);
    expect(card.querySelector('.section-toggle').getAttribute('aria-expanded')).toBe('true');
    expect(app.doc.activeElement).toBe(card.querySelector('h2'));
    card.querySelector('.section-toggle').click();
    expect(card.classList.contains('collapsed')).toBe(true);
    expect(card.querySelector('.section-toggle').getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the separate inventory section when adjusting a prize from the catalog', async () => {
    const app = await openPractice('admin');
    app.$('[data-tab="admin"]').click();
    const catalog = app.$('#catalog-form').closest('article.card');
    const inventory = app.$('#inventory-form').closest('article.card');
    app.$('.admin-index a[href="#' + catalog.id + '"]').click();
    expect(inventory.classList.contains('collapsed')).toBe(true);
    app.$('[data-adjust-catalog]').click();
    expect(inventory.classList.contains('collapsed')).toBe(false);
    expect(inventory.querySelector('.section-toggle').getAttribute('aria-expanded')).toBe('true');
    expect(app.doc.activeElement).toBe(app.$('#inventory-current'));
  });

  it('makes missing setup steps actionable and recognizes that administrators can run checkout', async () => {
    const app = await openPractice('admin', repo => {
      repo.members = repo.members.filter(m => m.role === 'admin');
      repo.categories.forEach(c => { c.active = false; });
      repo.catalog = [];
      repo.windows = [];
      repo.ledger = [];
      repo.orders = [];
    });
    app.$('[data-tab="admin"]').click();
    const rows = [...app.doc.querySelectorAll('#admin-checklist li')];
    expect(rows.find(row => row.textContent.includes('Someone can run')).classList.contains('done')).toBe(true);
    const categories = rows.find(row => row.textContent.includes('Recognition categories exist'));
    expect(categories.classList.contains('todo')).toBe(true);
    categories.querySelector('button').click();
    expect(app.$('#category-form').closest('article.card').classList.contains('collapsed')).toBe(false);
    rows.find(row => row.textContent.includes('first award')).querySelector('button').click();
    expect(app.$('[data-tab="award"]').getAttribute('aria-selected')).toBe('true');
    app.$('[data-tab="admin"]').click();
    rows.find(row => row.textContent.includes('first checkout')).querySelector('button').click();
    expect(app.$('[data-tab="store"]').getAttribute('aria-selected')).toBe('true');
  });

  it('keeps a selected student selected when their radio tile is clicked again', async () => {
    const app = await openPractice();
    app.$('[data-tab="award"]').click();
    const search = app.$('#award-student-search');
    search.value = 'Avery';
    search.dispatchEvent(new app.w.Event('input', { bubbles: true }));
    const tile = app.$('#award-student-tiles [role="radio"]');
    search.dispatchEvent(new app.w.Event('change', { bubbles: true }));
    expect(app.$('#award-student-tiles [role="radio"]')).toBe(tile);
    tile.click();
    const selected = app.$('#award-student').value;
    expect(selected).not.toBe('');
    app.$('#award-student-tiles [role="radio"]').click();
    expect(app.$('#award-student').value).toBe(selected);
    expect(app.$('#award-student-tiles [role="radio"]').getAttribute('aria-checked')).toBe('true');
  });

  it('records an award notice without doubling the period after an abbreviated surname', async () => {
    const app = await openPractice();
    app.$('[data-tab="award"]').click();
    const search = app.$('#award-student-search');
    search.value = 'Avery';
    search.dispatchEvent(new app.w.Event('input', { bubbles: true }));
    app.$('#award-student-tiles [role="radio"]').click();
    app.$('#award-amount').value = '20';
    app.$('#award-reason').value = 'Included a classmate in the group.';
    app.$('#award-form').dispatchEvent(new app.w.Event('submit', { bubbles: true, cancelable: true }));
    const notice = app.$('#notice');
    for (let i = 0; i < 100 && !notice.textContent.includes('Points recorded for'); i++) await pause(20);
    expect(notice.textContent).toContain('Points recorded for Avery R.');
    expect(notice.textContent).not.toContain('Avery R..');
    expect(notice.querySelector('button').textContent).toBe('Undo');
  });

  it('opens role-specific built-in help from the header and links to the manual', async () => {
    const app = await openPractice();
    const toggle = app.$('#help-toggle'), panel = app.$('#help-panel');
    expect(panel.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    expect(panel.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(app.doc.activeElement).toBe(panel);
    expect(panel.querySelector('[data-awarder]').hidden).toBe(false);
    expect(panel.querySelector('[data-checkout]').hidden).toBe(true);
    expect(panel.querySelector('[data-admin]').hidden).toBe(true);
    expect(panel.querySelector('[data-student]').hidden).toBe(true);
    expect(panel.textContent).toContain('Finding a student.');
    expect(panel.textContent).toContain('Growth levels never go down.');
    const links = [...panel.querySelectorAll('.help-links a')].map(a => a.getAttribute('href'));
    expect(links).toEqual(expect.arrayContaining([expect.stringContaining('school-rewards-manual'), expect.stringContaining('school-rewards-quick-cards'), expect.stringContaining('school-rewards-practice')]));
    panel.dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(panel.hidden).toBe(true);
    expect(app.doc.activeElement).toBe(toggle);
    toggle.click();
    app.$('#help-close').click();
    expect(panel.hidden).toBe(true);
  });

  it('shows students and cashiers only their own help sections and translates the panel', async () => {
    const student = await openPractice('student');
    student.$('#help-toggle').click();
    const panel = student.$('#help-panel');
    expect(panel.querySelector('[data-student]').hidden).toBe(false);
    expect(panel.querySelector('[data-awarder]').hidden).toBe(true);
    expect(panel.querySelector('[data-admin]').hidden).toBe(true);
    const lang = student.$('#lang-select');
    lang.value = 'es';
    lang.dispatchEvent(new student.w.Event('change', { bubbles: true }));
    await pause(60);
    expect(panel.querySelector('.eyebrow').textContent).toBe('Ayuda integrada');
    expect(student.$('#help-toggle').textContent).toBe('Ayuda');
    const cashier = await openPractice('cashier');
    cashier.$('#help-toggle').click();
    expect(cashier.$('#help-panel [data-checkout]').hidden).toBe(false);
    expect(cashier.$('#help-panel [data-awarder]').hidden).toBe(true);
  });

  it('tells the cashier when a window marked Open has not started yet', async () => {
    const starts = new Date(Date.now() + 36 * 3600 * 1000), ends = new Date(Date.now() + 72 * 3600 * 1000);
    const app = await openPractice('cashier', repo => { repo.windows[0].status = 'OPEN'; repo.windows[0].startsAt = starts.toISOString(); repo.windows[0].endsAt = ends.toISOString(); });
    app.$('[data-tab="store"]').click();
    const note = app.$('#store-window-note').textContent;
    expect(note).toContain('Trimester 1 is set to Open, but shopping has not started yet.');
    expect(note).toMatch(/Checkout opens \d{4}-\d{2}-\d{2} \d{2}:\d{2}\./);
    expect(app.$('#checkout-submit').disabled).toBe(true);
  });

  it('cancels pending tour steps on Escape and ignores superseded step timers', async () => {
    const app = await openPractice();
    app.$('#practice-tour').click();
    app.doc.dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Escape' }));
    await pause(400);
    expect(app.$('.tour-box')).toBeNull();
    expect(app.$('.tour-target')).toBeNull();
    app.w.srPracticeTour.show(0);
    app.w.srPracticeTour.show(1);
    await pause(400);
    expect(app.$('.tour-box h2').textContent).toBe(app.w.srPracticeTour.steps()[1].title);
    expect(app.doc.querySelectorAll('.tour-target')).toHaveLength(1);
    app.$('[data-tour="exit"]').click();
    expect(app.$('.tour-box')).toBeNull();
    expect(app.doc.activeElement).toBe(app.$('#practice-tour'));
  });
});
