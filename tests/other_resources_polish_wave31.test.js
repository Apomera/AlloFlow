import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import axe from 'axe-core';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const cleanups = [];

function readRepoFile(relPath) {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

function assertMirrorsMatch(relPath) {
  const src = readRepoFile(relPath);
  for (const prefix of ['desktop/web-app/public/', 'desktop/web-app/build/', 'desktop/app-build/']) {
    expect(readRepoFile(prefix + relPath), prefix + relPath).toBe(src);
  }
  return src;
}

async function runAxe(container) {
  let target = container;
  let tempHost = null;
  if (container && container.ownerDocument !== document) {
    tempHost = document.createElement('div');
    tempHost.innerHTML = container.innerHTML;
    document.body.appendChild(tempHost);
    target = tempHost;
  }
  try {
    const result = await axe.run(target, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
  } finally {
    if (tempHost) tempHost.remove();
  }
}

function loadPageDom(htmlFile, { execScripts = true, injectScripts = [], beforeParseExtra = null, urlPath = null } = {}) {
  const raw = readRepoFile(htmlFile);
  let html = raw
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '')
    .replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*<\/script>/gi, '');
  if (injectScripts.length) {
    const inlineTags = injectScripts
      .map((scriptPath) => `<script>${readRepoFile(scriptPath)}</script>`)
      .join('\n');
    if (/<script\b/i.test(html)) {
      html = html.replace(/<script\b/i, (m) => `${inlineTags}\n${m}`);
    } else {
      html = html.replace(/<\/body>/i, (m) => `${inlineTags}\n${m}`);
    }
  }
  const dom = new JSDOM(html, {
    url: 'https://alloflow-cdn.pages.dev/' + (urlPath || htmlFile),
    runScripts: execScripts ? 'dangerously' : undefined,
    beforeParse(win) {
      win.matchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
      win.scrollTo = vi.fn();
      win.HTMLElement.prototype.scrollIntoView = vi.fn();
      win.requestAnimationFrame = () => 1;
      win.cancelAnimationFrame = () => {};
      if (beforeParseExtra) beforeParseExtra(win);
    },
  });
  cleanups.push(() => { dom.window.close(); });
  return { raw, dom, win: dom.window, doc: dom.window.document };
}

afterEach(() => {
  while (cleanups.length) {
    const fn = cleanups.pop();
    fn();
  }
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Other Resources Polish — Wave 31', () => {
  it('polishes Video Studio (44px controls, disabled contrast, accessible PiP mirror, aria-hidden offscreen canvases & clipboard fallback, VS_SHARED parity) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('video_studio/video_studio.html');
    const mod = readRepoFile('video_studio_module.js');

    // Verify [VS_SHARED_BEGIN..END] stays verbatim identical to video_studio_module.js
    const vsBegin = '// [VS_SHARED_BEGIN]';
    const vsEnd = '// [VS_SHARED_END]';
    const htmlBlock = src.slice(src.indexOf(vsBegin), src.indexOf(vsEnd) + vsEnd.length);
    const modBlock = mod.slice(mod.indexOf(vsBegin), mod.indexOf(vsEnd) + vsEnd.length);
    expect(htmlBlock.length).toBeGreaterThan(500);
    expect(htmlBlock).toBe(modBlock);

    expect(src).toContain('button.action { min-height: 44px;');
    expect(src).toContain('button.action:disabled { background: #334155; color: #cbd5e1;');
    expect(src).toContain('button.quiet { min-height: 44px;');
    expect(src).toContain('button.danger { min-height: 44px;');
    expect(src).toContain('#demoPlanBtn { flex: 0 0 auto; min-height: 44px; }');
    expect(src).toContain("pc.setAttribute('role', 'img');");
    expect(src).toContain("pc.setAttribute('aria-label', 'Screen Coach live mirrored screen');");
    expect(src).toContain("area.setAttribute('aria-label', 'Temporary clipboard copy buffer')");

    const { doc } = loadPageDom('video_studio/video_studio.html', { execScripts: false });
    await runAxe(doc.body);
  });

  it('polishes IT Screen Coach (reduced-motion, 44px controls, contrast, aria-hidden offscreen canvases, PiP mirror role/label, IME-safe Escape on goal/chat/review) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('it_coach/it_coach.html');
    expect(src).toContain('--dim: #cbd5e1;');
    expect(src).toContain('details > summary { min-height: 44px;');
    expect(src).toContain('@media (prefers-reduced-motion: reduce)');
    expect(src).toContain("cv.setAttribute('role', 'img');");
    expect(src).toContain("cv.setAttribute('aria-label', 'AlloBot Screen Coach live mirrored screen');");

    const { win, doc } = loadPageDom('it_coach/it_coach.html', {
      injectScripts: ['video_studio_module.js', 'ai_backend_module.js', 'it_coach/image_review.js'],
    });

    // Goal input IME-safe Escape clear
    const goal = doc.getElementById('coachGoal');
    const coachStatus = doc.getElementById('coachStatus');
    goal.value = 'Turn on live captions';
    goal.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(goal.value).toBe('Turn on live captions');
    goal.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(goal.value).toBe('');
    expect(coachStatus.textContent).toContain('Goal cleared');

    // Chat draft IME-safe Escape clear
    const chat = doc.getElementById('coachChatInput');
    const chatStatus = doc.getElementById('coachChatStatus');
    chat.value = 'Where is the captions menu?';
    chat.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(chat.value).toBe('Where is the captions menu?');
    chat.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(chat.value).toBe('');
    expect(chatStatus.textContent).toContain('Chat draft cleared');

    // Open screen review cancels cleanly on Escape (respecting IME composition)
    const screenReview = doc.getElementById('screenReview');
    const cancelBtn = doc.getElementById('reviewCancelBtn');
    const cancelSpy = vi.fn();
    cancelBtn.addEventListener('click', cancelSpy);
    screenReview.hidden = false;
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(cancelSpy).not.toHaveBeenCalled();
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    screenReview.hidden = true;

    await runAxe(doc.body);
  });

  it('polishes Access Lens Camera (44px controls, reduced-motion, forced-colors, contrast, aria-hidden capture canvas, IME-safe shutter & Escape retake) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('access_lens/access_lens.html');
    expect(src).toContain('button { min-height: 44px;');
    expect(src).toContain('@media (prefers-reduced-motion: reduce)');
    expect(src).toContain('@media (forced-colors: active)');
    expect(src).toContain("c.setAttribute('aria-hidden', 'true');");

    const fakeStream = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMedia = vi.fn(async () => fakeStream);

    const { win, doc } = loadPageDom('access_lens/access_lens.html', {
      beforeParseExtra(w) {
        Object.defineProperty(w.navigator, 'mediaDevices', {
          value: { getUserMedia },
          configurable: true,
        });
        w.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() }));
        w.HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,AAAA');
      },
    });
    await new Promise((r) => setTimeout(r, 20));

    const cam = doc.getElementById('cam');
    const reviewRow = doc.getElementById('reviewRow');
    Object.defineProperty(cam, 'videoWidth', { value: 640, configurable: true });
    Object.defineProperty(cam, 'videoHeight', { value: 480, configurable: true });

    // IME Enter must not snap; real Enter snaps into review mode
    cam.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
    expect(reviewRow.classList.contains('hidden')).toBe(true);
    cam.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(reviewRow.classList.contains('hidden')).toBe(false);

    // IME Escape does not trigger retake; real Escape triggers retake
    const callsBefore = getUserMedia.mock.calls.length;
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(getUserMedia.mock.calls.length).toBe(callsBefore);
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
    expect(getUserMedia.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(reviewRow.classList.contains('hidden')).toBe(true);

    await runAxe(doc.body);
  });

  it('polishes Zoom Gallery (44px controls, contrast, aria-hidden snapshot canvas, IME-safe custom URL Enter/Escape) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('zoom_gallery/zoom_gallery.html');
    expect(src).toContain('--dim: #cbd5e1;');
    expect(src).toContain('button.sec.speak { margin-top: 8px; padding: 8px 10px; min-height: 44px;');
    expect(src).toContain('.backbar .stagectl button { min-width: 44px; min-height: 44px;');
    expect(src).toContain("var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true');");

    const { win, doc } = loadPageDom('zoom_gallery/zoom_gallery.html');
    const customUrl = doc.getElementById('customUrl');
    const customErr = doc.getElementById('customErr');
    customUrl.value = 'https://example.org/image.jpg';
    customErr.textContent = 'Sample error';

    customUrl.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(customUrl.value).toBe('https://example.org/image.jpg');
    customUrl.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(customUrl.value).toBe('');
    expect(customErr.textContent).toBe('');

    await runAxe(doc.body);
  });

  it('polishes AlloSheet (44px skip-link, IME-safe Escape on analysisFilterValue and newSheetForm with focus return) with mirror parity and zero axe violations', async () => {
    const css = assertMirrorsMatch('allo_sheet/allo_sheet.css');
    const js = assertMirrorsMatch('allo_sheet/allo_sheet.js');
    assertMirrorsMatch('allo_sheet/allo_sheet.html');
    expect(css).toContain('.skip-link {\n  position: fixed;\n  top: 0.5rem;\n  left: 0.5rem;\n  z-index: 20;\n  min-height: 44px;');
    expect(js).toContain("byId('analysisFilterValue').addEventListener('keydown'");
    expect(js).toContain("byId('newSheetForm').addEventListener('keydown'");

    const { win, doc } = loadPageDom('allo_sheet/allo_sheet.html', {
      injectScripts: [
        'allo_sheet/allo_sheet_adapter.js',
        'allo_sheet/allo_sheet_analysis.js',
        'allo_sheet/allo_sheet_workspace.js',
        'allo_sheet/allo_sheet_casebook.js',
        'allo_sheet/allo_sheet_casebook_ui.js',
        'allo_sheet/allo_sheet.js',
      ],
      beforeParseExtra(w) {
        w.fetch = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
      },
    });
    await new Promise((r) => setTimeout(r, 20));

    // Open New Sheet form and test IME-safe Escape close returning focus to #showNewSheetButton
    const showBtn = doc.getElementById('showNewSheetButton');
    const form = doc.getElementById('newSheetForm');
    doc.getElementById('canvasFallback').hidden = false;
    showBtn.click();
    expect(form.hidden).toBe(false);

    form.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(form.hidden).toBe(false);
    form.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(form.hidden).toBe(true);
    expect(doc.activeElement).toBe(showBtn);

    // Analysis filter input IME-safe Escape clear
    const filterInput = doc.getElementById('analysisFilterValue');
    filterInput.disabled = false;
    filterInput.value = 'Period 2';
    filterInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }));
    expect(filterInput.value).toBe('Period 2');
    filterInput.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(filterInput.value).toBe('');

    await runAxe(doc.body);
  });

  it('polishes veraPDF Validator (44px controls, forced-colors skip-link, live reading-order status and IME-safe Escape stop) with mirror parity and zero axe violations', async () => {
    const src = assertMirrorsMatch('verapdf/verapdf_validator.html');
    expect(src).toContain('button { min-height: 44px;');
    expect(src).toContain('input[type=file] { margin: 12px 0; min-height: 44px;');
    expect(src).toContain('.skip-link { position: absolute; inset-inline-start: 8px; top: 8px; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; pointer-events: none; z-index: 9999; min-height: 44px;');
    expect(src).toContain('id="ro-status" class="muted" role="status" aria-live="polite"');
    expect(src).toContain("if (ev.key === 'Escape' && _roSpeaking)");

    const { doc } = loadPageDom('verapdf/verapdf_validator.html', { execScripts: false });
    await runAxe(doc.body);
  });
});
