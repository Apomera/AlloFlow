import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Galaxy Explorer's fullscreen button was native-only: it returned silently when
// requestFullscreen was missing and only undid its own styling when the request was
// refused. On a sandboxed embed without allow="fullscreen" — which is how this tool
// reaches learners on the Canvas surface — that is every code path, so the button
// looked broken. These pins are on the SOURCE because the behaviour needs a real
// browser (jsdom has no fullscreen API and no layout); the browser-level check lives
// in dev-tools/galaxy_no_webgl_check.cjs alongside the other galaxy harnesses.
const TOOL_PATHS = [
  'stem_lab/stem_tool_galaxy.js',
  'desktop/web-app/public/stem_lab/stem_tool_galaxy.js',
];

describe('Galaxy Explorer fullscreen', () => {
  TOOL_PATHS.forEach((filePath) => {
    const tool = readFileSync(resolve(process.cwd(), filePath), 'utf8');

    describe(filePath, () => {
      it('tries both spellings of the native API', () => {
        expect(tool).toContain('frame.requestFullscreen || frame.webkitRequestFullscreen');
        expect(tool).toContain('document.exitFullscreen || document.webkitExitFullscreen');
        expect(tool).toContain('document.fullscreenElement || document.webkitFullscreenElement');
        expect(tool).toContain("document.addEventListener('webkitfullscreenchange', galaxyFsOnChange)");
      });

      it('never dead-ends: every native failure reaches the immersive fallback', () => {
        expect(tool).toContain('function galaxyFsEnterCss()');
        // Missing API, or an iframe that was not granted the permission.
        expect(tool).toContain('if (!request || document.fullscreenEnabled === false) { galaxyFsEnterCss(); return; }');
        // A rejected promise and a synchronous throw both land in the same place.
        expect(tool).toContain('if (result && result.catch) result.catch(failed);');
        expect(tool).toContain('try { result = request.call(frame); } catch (err) { failed(); return; }');
        expect(tool).toMatch(/var failed = function \(\)[\s\S]{0,400}galaxyFsEnterCss\(\);/);
        // The old silent bail is gone.
        expect(tool).not.toContain('if (!frame || !frame.requestFullscreen) return;');
      });

      it('gives the immersive view an exit that a sighted learner can find', () => {
        expect(tool).toContain("data-galaxy-exit-immersive");
        expect(tool).toContain('Exit fullscreen (Esc)');
        expect(tool).toContain('function galaxyFsOnKey(event)');
        expect(tool).toContain("event.key !== 'Escape' || !galaxyCssFullscreen");
        // Escape must not fall through to the shell's close-the-tool handler.
        expect(tool).toMatch(/event\.stopPropagation\(\);\s*galaxyFsExitCss\(\);/);
      });

      it('measures where the fixed frame actually landed instead of trusting inset 0', () => {
        expect(tool).toContain('function galaxyFsFitViewport()');
        expect(tool).toContain("frame.style.top = (-rect.top) + 'px'");
        expect(tool).toContain("window.addEventListener('resize', galaxyFsFitViewport)");
        expect(tool).toContain("window.removeEventListener('resize', galaxyFsFitViewport)");
      });

      it('restores the page on teardown so leaving the tool cannot strand a fixed overlay', () => {
        expect(tool).toContain('canvasEl._galaxyFullscreenTeardown = function ()');
        expect(tool).toContain('if (canvasEl._galaxyFullscreenTeardown) { canvasEl._galaxyFullscreenTeardown(); canvasEl._galaxyFullscreenTeardown = null; }');
        expect(tool).toContain('document.body.style.overflow = saved.bodyOverflow');
        expect(tool).toContain('function galaxyFsHideExitPill()');
      });
    });
  });

  it('keeps the deploy mirror byte-identical', () => {
    const a = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]));
    const b = readFileSync(resolve(process.cwd(), TOOL_PATHS[1]));
    expect(a.equals(b)).toBe(true);
  });
});
