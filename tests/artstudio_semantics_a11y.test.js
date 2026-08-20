import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_artstudio.js');
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  resetStemLab();
  vi.restoreAllMocks();
});

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: originalMatchMedia,
  });
});

describe('Art Studio graphic and form semantics', () => {
  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });

  it('names the harmony visualization, inquiry fields, and scoped data headers', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'harmonyHunt',
        _harmonyHunt: {
          baseHue: 200,
          satBlend: 70,
          litVar: 50,
          rotation: 0,
          paletteSize: 3,
          hypothesis: '',
          understood: true,
          explanation: '',
          log: [{ h: 200, s: 70, l: 50, r: 0, n: 3, t: 'triadic' }],
        },
      },
    });

    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Color harmony wheel showing');
    expect(html).toContain('aria-label="Color harmony hypothesis"');
    expect(html).toContain('aria-label="Explain your understanding of color harmony"');
    expect(html).toContain('scope="col"');
  });

  it('names the interactive and output stereogram canvases', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const staticHtml = renderTool('artStudio', {
      artStudio: {
        tab: 'stereogram',
      },
    });
    const animatedHtml = renderTool('artStudio', {
      artStudio: {
        tab: 'stereogram',
        stereoAnimMode: 'animate',
        stereoAnimSource: 'draw',
        stereoAnimKeyframes: [{ width: 2, height: 2, data: new Array(16).fill(0) }],
        stereoAnimHasFrames: true,
        stereoAnimPlaying: false,
      },
    });

    expect(staticHtml).toContain('aria-label="Depth map drawing canvas.');
    expect(staticHtml).toContain('aria-label="Stereogram output using the');
    expect(animatedHtml).toContain('aria-label="Animation depth-map drawing canvas.');
    expect(animatedHtml).toContain('aria-label="Depth-map keyframe 1 of 1"');
    expect(animatedHtml).toContain('aria-label="Animated stereogram output with 0 rendered frames; paused."');
  });

  it('associates visible AI labels with their textareas', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const staticHtml = renderTool('artStudio', {
      artStudio: {
        tab: 'stereogram',
      },
    }, {
      callImagen: () => Promise.resolve(''),
    });
    const animatedHtml = renderTool('artStudio', {
      artStudio: {
        tab: 'stereogram',
        stereoAnimMode: 'animate',
        stereoAnimSource: 'ai',
      },
    }, {
      callImagen: () => Promise.resolve(''),
    });

    expect(staticHtml).toContain('for="artstudio-stereo-ai-description"');
    expect(staticHtml).toContain('id="artstudio-stereo-ai-description"');
    expect(animatedHtml).toContain('for="artstudio-stereo-animation-ai-prompt"');
    expect(animatedHtml).toContain('id="artstudio-stereo-animation-ai-prompt"');
  });

  it('exposes the watercolor canvas, controls, and keyboard instructions', () => {
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'watercolor',
      },
    });

    expect(html).toContain('id="watercolorCanvas"');
    expect(html).toContain('aria-label="Watercolor painting canvas. Focus and use Arrow keys');
    expect(html).toContain('id="artstudio-watercolor-keyboard-help"');
    expect(html).toContain('aria-describedby="artstudio-watercolor-keyboard-help artstudio-watercolor-status"');
    expect(html).toContain('Control+Z Control+Y Meta+Z Meta+Y');
    expect(html).toContain('Enter Space P Control+Z');
    expect(html).toContain('id="artstudio-watercolor-status" role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('id="artstudio-watercolor-undo"');
    expect(html).toContain('id="artstudio-watercolor-redo"');
    expect(html).toContain('id="artstudio-watercolor-pause"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('Pause drying');
    expect(html).toContain('Resume drying');
    expect(html).toContain('Undo');
    expect(html).toContain('Redo');
    expect(html).toContain('aria-label="Pigment color"');
    expect(html).toContain('Granulation');
    expect(html).toContain('Bleed');
    expect(html).toContain('Absorption');
    expect(html).toContain('Hot press');
    expect(html).toContain('Rough');
    expect(html).toContain('Clear water');
    expect(html).toContain('Lift');
    expect(html).toContain('Splatter');
    expect(html).toContain('Salt texture');
    expect(html).toContain('Masking fluid');
    expect(html).toContain('Peel mask');
    expect(html).toContain('Drying rate');
    expect(html).toContain('Tilt strength');
    expect(html).toContain('id="artstudio-watercolor-remove-mask"');
    expect(html).toContain('Remove all mask');
    expect(html).toContain('Down');
    expect(html).toContain('Still');
    expect(html).toContain('Reload brush');
    expect(html).toContain('Export PNG');
  });

  it('suppresses the AI pulse when reduced motion is requested', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'stereogram',
        stereoAiGen: 'depth map',
      },
    }, {
      callImagen: () => Promise.resolve(''),
    });

    expect(html).toContain('Generating depth map');
    expect(html).not.toContain('animate-pulse');
  });

  it('marks every exposed canvas that lacked semantics with a role and name', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('role: "img", "aria-label": "Uploaded depth map preview"');
    expect(source).toContain('role: "img", "aria-label": "AI-generated depth map preview"');
    expect(source).toContain('"aria-label": \'3D sculpture preview. \' + sculptSummary');
    expect(source).toContain('"aria-describedby": "artstudio-sculpt-keyboard-help"');
  });
});
