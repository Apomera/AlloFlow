// Timeline Studio review, 2026-09-06. Pins the fixes from a read of the module
// and its companion window:
//  - the companion accepted allotimeline-data from ANY window (its theme
//    listener already checked the opener; the data listener did not), and
//    TimelineJS renders text fields as HTML;
//  - paste mode sent model output unescaped, and the title was unescaped in
//    both modes;
//  - the companion always opened dark: it reads ?theme= and nothing passed it;
//  - the host's gradeLevel prop was ignored;
//  - the manual-builder drawer stayed in the tab order while closed.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULE = 'timeline_studio_module.js';
const HTML = 'timeline_studio/timeline_studio.html';
const moduleSrc = readFileSync(MODULE, 'utf8');
const htmlSrc = readFileSync(HTML, 'utf8');
let H;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('timeline_revision_module.js');
  loadAlloModule(MODULE);
  H = window.AlloModules.TimelineStudioHelpers;
  if (!H) throw new Error('TimelineStudioHelpers failed to register');
});

const HOSTILE = '<img src=x onerror="alert(1)">';

describe('companion window only listens to its opener', () => {
  it('guards the data listener by opener AND origin, since an attacker page can be the opener', () => {
    const dataListener = htmlSrc.slice(htmlSrc.indexOf('// ── Bridge with opener ──'));
    expect(dataListener).toContain('if (!isTrustedOpenerMessage(event)) return;');
    expect(dataListener).toContain('if (!event || event.source !== window.opener) return false;');
    expect(dataListener).toContain('return isTrustedOrigin(event.origin);');
    // and requires an object payload before handing it to the renderer
    expect(dataListener).toContain("msg.type === 'allotimeline-data' && msg.timeline && typeof msg.timeline === 'object'");
  });

  it('the origin allowlist, lifted from the page, accepts AlloFlow hosts and refuses the rest', () => {
    const start = htmlSrc.indexOf('function isTrustedOrigin(origin) {');
    expect(start).toBeGreaterThan(-1);
    let depth = 0, i = htmlSrc.indexOf('{', start);
    const open = i;
    for (; i < htmlSrc.length; i += 1) { if (htmlSrc[i] === '{') depth += 1; else if (htmlSrc[i] === '}') { depth -= 1; if (depth === 0) break; } }
    // eslint-disable-next-line no-new-func
    const fn = new Function('window', 'origin', htmlSrc.slice(open + 1, i));
    const win = { location: { origin: 'https://alloflow-cdn.pages.dev' } };
    const ok = (o) => fn(win, o);
    expect(ok('https://alloflow-cdn.pages.dev')).toBe(true);
    // Cloudflare Pages preview deploys are subdomains of the project host
    expect(ok('https://abc123.alloflow-cdn.pages.dev')).toBe(true);
    expect(ok('http://localhost:5173')).toBe(true);
    expect(ok('http://127.0.0.1:8080')).toBe(true);
    // a host that merely STARTS with the name, or ends with it, is not ours
    expect(ok('https://alloflow.evil.example')).toBe(false);
    expect(ok('https://alloflow-cdn.pages.dev.evil.example')).toBe(false);
    expect(ok('https://evil-alloflow-cdn.pages.dev')).toBe(false);
    // the retired Firebase host would have admitted every *.web.app site
    expect(ok('https://prismflow-911fe.web.app')).toBe(false);
    expect(ok('https://anyone.web.app')).toBe(false);
    // the production host over plain http is not the production host
    expect(ok('http://alloflow-cdn.pages.dev')).toBe(false);
    expect(ok('https://evil.example')).toBe(false);
    expect(ok('null')).toBe(false);
    expect(ok('')).toBe(false);
    expect(ok(undefined)).toBe(false);
  });

  it('standalone use (no opener) still works, because it needs no messages', () => {
    expect(htmlSrc).toContain('if (!window.opener) return true; // standalone: nothing sends messages');
  });

  it('the studio ignores messages from windows it did not open, and replies only to its own', () => {
    expect(moduleSrc).toContain('if (!winRef.current || ev.source !== winRef.current) return;');
    expect(moduleSrc).not.toContain('var replyTo = ev.source || winRef.current;');
    expect(moduleSrc).not.toMatch(/postMessage\(\{ type: 'allotimeline-data'[^)]*\}, '\*'\)/);
    expect(moduleSrc).toContain('var COMPANION_ORIGIN');
  });
});

describe('model output cannot inject markup into the companion', () => {
  it('escapes the title and events in paste mode (research absent)', () => {
    const tl = {
      title: { text: { headline: 'Title ' + HOSTILE, text: 'Body ' + HOSTILE } },
      events: [{ start_date: { year: '1969' }, text: { headline: 'Moon ' + HOSTILE, text: 'Landing ' + HOSTILE } }],
    };
    const out = H.decorateTimelineForDisplay(tl, null, undefined).timeline;
    const flat = JSON.stringify(out);
    expect(flat).not.toContain('<img');
    expect(flat).toContain('&lt;img');
    expect(out.title.text.headline).toBe('Title ' + H.escapeHtml(HOSTILE));
    expect(out.events[0].text.headline).toBe('Moon ' + H.escapeHtml(HOSTILE));
  });

  it('escapes the title in topic mode too, while keeping the disclosure markup', () => {
    const tl = {
      title: { text: { headline: HOSTILE, text: 'ok' } },
      events: [{ start_date: { year: '1969' }, text: { headline: 'Moon', text: 'Landing' } }],
    };
    const research = { hasGrounding: true, sourcedCount: 0, docSources: [], attributionMode: 'none', verifyStatus: 'failed' };
    const out = H.decorateTimelineForDisplay(tl, research, undefined).timeline;
    expect(out.title.text.headline).not.toContain('<img');
    expect(out.title.text.headline).toContain('&lt;img');
    // the studio's own disclosure still rides in as markup
    expect(out.title.text.text).toContain('<small>');
  });

  it('leaves a response with no title title-less rather than inventing an empty slide', () => {
    const out = H.decorateTimelineForDisplay({ events: [] }, null, undefined).timeline;
    expect(out.title).toBeUndefined();
  });

  it('paste mode routes through the escaper in the source', () => {
    expect(moduleSrc).not.toContain('dataRef.current = tl;');
    expect(moduleSrc).toContain('dataRef.current = decorateTimelineForDisplay(tl, null, t).timeline;');
  });
});

describe('the companion opens in the teacher\'s theme', () => {
  function docWith(cls) {
    const root = { classList: { contains: (c) => c === cls } };
    return { documentElement: root, body: { classList: { contains: () => false } } };
  }
  it('reads the host theme class from the document root or body', () => {
    expect(H.hostTheme(docWith('theme-contrast'))).toBe('contrast');
    expect(H.hostTheme(docWith('theme-dark'))).toBe('dark');
    expect(H.hostTheme(docWith('nothing'))).toBe('light');
    const bodyOnly = { documentElement: { classList: { contains: () => false } }, body: { classList: { contains: (c) => c === 'theme-contrast' } } };
    expect(H.hostTheme(bodyOnly)).toBe('contrast');
  });

  it('passes it on the companion URL, which defaults to dark when absent', () => {
    expect(moduleSrc).toContain("withParam(withParam(TIMELINE_STUDIO_URL, 'lang', lang), 'theme', hostTheme())");
    expect(htmlSrc).toContain("applyAlloFlowTheme(new URLSearchParams(window.location.search).get('theme'))");
  });
});

describe('the host grade level seeds the reading-level select', () => {
  it('maps the shapes the host may send onto the four levels', () => {
    expect(H.gradeToLevel(undefined)).toBe('middle-school');
    expect(H.gradeToLevel('')).toBe('middle-school');
    expect(H.gradeToLevel('high-school')).toBe('high-school');
    expect(H.gradeToLevel('K')).toBe('early-elementary');
    expect(H.gradeToLevel('2')).toBe('early-elementary');
    expect(H.gradeToLevel('Grade 4')).toBe('upper-elementary');
    expect(H.gradeToLevel(7)).toBe('middle-school');
    expect(H.gradeToLevel('10th grade')).toBe('high-school');
    expect(H.gradeToLevel('secondary')).toBe('high-school');
    expect(H.gradeToLevel('elephant')).toBe('middle-school');
  });
  it('is used for the initial state', () => {
    expect(moduleSrc).toContain("React.useState(gradeToLevel(props.gradeLevel))");
  });
});

describe('the manual-builder drawer is a real disclosure', () => {
  it('leaves the tab order while closed', () => {
    expect(htmlSrc).toMatch(/\.drawer \{[^}]*visibility: hidden;/);
    expect(htmlSrc).toMatch(/\.drawer\.open \{[^}]*visibility: visible;/);
    expect(htmlSrc).toContain('id="drawer" aria-label="Manual timeline builder" inert>');
  });
  it('announces its state and moves focus with it', () => {
    expect(htmlSrc).toContain('aria-expanded="false" aria-controls="drawer"');
    expect(htmlSrc).toContain("builderBtn.setAttribute('aria-expanded', open ? 'true' : 'false');");
    expect(htmlSrc).toContain("if (open && first) first.focus(); else if (!open) builderBtn.focus();");
    expect(htmlSrc).toContain('prefers-reduced-motion: reduce');
  });

  it('can be closed from inside, since the open panel covers the header toggle', () => {
    // a 44px close control in the drawer head, and Escape from anywhere in it
    expect(htmlSrc).toContain('id="drawerCloseBtn" type="button" aria-label="Close the manual event builder"');
    expect(htmlSrc).toMatch(/\.drawer \.drawer-close \{[^}]*min-width: 44px; min-height: 44px;/);
    expect(htmlSrc).toContain("document.getElementById('drawerCloseBtn').addEventListener('click', function () { setDrawer(false); });");
    expect(htmlSrc).toContain("if (ev.key === 'Escape' && drawer.classList.contains('open')) { ev.preventDefault(); setDrawer(false); }");
  });
});

describe('mirrors', () => {
  it('module and companion are byte-identical with their desktop copies', () => {
    expect(readFileSync('desktop/web-app/public/timeline_studio_module.js', 'utf8')).toBe(moduleSrc);
    expect(readFileSync('desktop/web-app/public/timeline_studio/timeline_studio.html', 'utf8')).toBe(htmlSrc);
  });
});
