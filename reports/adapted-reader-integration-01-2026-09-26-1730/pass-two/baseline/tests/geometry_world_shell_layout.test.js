// Geometry World inside the real STEAM Lab shell, on a phone.
//
// Every Geometry World harness (unit, preview.cjs, e2e) mounts the tool in a wrapper that fills the viewport. The
// shell does not: it wraps a plugin in a block with only a min-height, so the tool's height:100% resolves to auto.
// Measured on the deployed build (2b2407ccf) at 390x844 on 2026-09-14:
//   - the workspace collapsed to its toolbar plus the canvas's intrinsic 150px: a 164px world, and the home
//     chooser a 220px scroll box showing only its heading;
//   - the app's mobile stylesheet (ui_font_library_module.js) turns every nav[aria-label] > button into a
//     nowrap / max-content snap item, so the chooser's mode cards stopped wrapping and were clipped mid-sentence;
//   - the ≤720px rule for the action bar moved it to left:8px but kept the inline translateX(-50%), leaving the
//     bar 93px off the left edge with Match and Fly unreachable.
// Desktop was unaffected by all three (workspace 740px, cards wrapped, bar centred), which is why nobody saw them.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const CORE = ['stem_lab/stem_tool_geometryworld.js', 'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js'];
const BUILDER = ['stem_lab/stem_tool_geometryworld_builder.js', 'desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js'];

describe('Geometry World survives the shell on a phone', () => {
  it('gives the workspace a height floor, since the host block only has a min-height', () => {
    for (const file of CORE) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain("style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'min(640px, calc(100vh - 270px))', position: 'relative', background: 'var(--allo-stem-canvas, #000)' }");
    }
  });

  it('keeps the action bar on screen at phone widths: no leftover centring transform once left and right are pinned', () => {
    for (const file of CORE) {
      const source = readFileSync(file, 'utf8');
      const rule = '.gw-action-bar{left:8px!important;right:8px!important;bottom:94px!important;transform:none!important;width:auto!important;}';
      const at = source.indexOf(rule);
      expect(at, file).toBeGreaterThan(-1);
      // inside the 720px media block, which starts on the same style line
      const lineStart = source.lastIndexOf('\n', at);
      expect(source.slice(lineStart, at)).toContain('@media(max-width:720px)');
      // the inline style still centres by transform on wider screens, so the override is what keeps phones sane
      expect(source).toContain("style: { position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', width: 'max-content'");
    }
  });

  it('out-specifies the app\'s mobile nav rule so the mode cards keep wrapping', () => {
    for (const file of BUILDER) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain('@media(max-width:768px){.gwe-home nav.gwe-home-grid{overflow:visible;scroll-snap-type:none;flex-wrap:wrap}.gwe-home nav.gwe-home-grid>button.gwe-home-card{white-space:normal;min-width:0;flex-shrink:1;scroll-snap-align:none}}');
      expect(source).toContain("h('nav',{className:'gwe-home-grid','aria-label':'Geometry World modes'}");
    }
    // The reason must stay true: the shell still ships that rule at the same breakpoint.
    const host = readFileSync('ui_font_library_module.js', 'utf8');
    const at = host.indexOf('nav[aria-label] > button {');
    expect(at).toBeGreaterThan(-1);
    expect(host.slice(at, at + 200)).toContain('white-space: nowrap;');
    expect(host.lastIndexOf('@media (max-width: 768px)', at)).toBeGreaterThan(at - 600);
  });
});

// Same sweep, another tool: Oratory's graph canvases are authored 600 CSS px wide and the host's setupHiDPI pins
// that width inline (style.width outranks the w-full class), so on a phone in the shell the tool scrolled 255 px
// sideways (144-tile real-shell sweep, 2026-09-15). The logical width now fits the parent's content box.
describe('Oratory fits its graph canvases to the phone', () => {
  it('sizes every HiDPI canvas from the parent content box, not its 600 px attribute', () => {
    for (const file of ['stem_lab/stem_tool_oratory.js', 'desktop/web-app/public/stem_lab/stem_tool_oratory.js']) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain('function fitCanvasWidth(canvas) {');
      expect(source).toContain("var avail = parent.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);");
      expect(source.split('window.StemLab.setupHiDPI(canvas, fitCanvasWidth(canvas), canvas._logicalH || canvas.height);').length - 1).toBe(9);
      expect(source).not.toContain('setupHiDPI(canvas, canvas._logicalW || canvas.width');
    }
    // the host still pins style.width, which is why the tool must pass a fitted width
    const host = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    expect(host).toContain("canvas.style.width = logicalW + 'px';");
  });
});

// Same sweep: City Planning Lab's parcel cells are buttons, and the app's phone stylesheet gives every button a
// 44 px minimum, so its twelve columns need 528 px and the whole STEAM Lab page scrolled sideways by 179 px on a
// phone. The map now scrolls inside its own box, with the boundary lines inside the sized wrapper.
describe('City Planning Lab scrolls its parcel map inside its own box', () => {
  it('wraps the grid in an overflow-x container sized to its content', () => {
    for (const file of ['stem_lab/stem_tool_citylab.js', 'desktop/web-app/public/stem_lab/stem_tool_citylab.js']) {
      const source = readFileSync(file, 'utf8');
      const wrapper = source.indexOf("h('div', { className: 'w-full overflow-x-auto', style: { WebkitOverflowScrolling: 'touch' } },");
      expect(wrapper, file).toBeGreaterThan(-1);
      const sized = source.indexOf("h('div', { className: 'relative', style: { width: 'max-content', minWidth: '100%', maxWidth: '528px' } },", wrapper);
      expect(sized).toBeGreaterThan(wrapper);
      const grid = source.indexOf("gridTemplateColumns: 'repeat(12, 1fr)'", sized);
      expect(grid).toBeGreaterThan(sized);
      const lines = source.indexOf("className: 'absolute inset-0', style: { pointerEvents: 'none' } }, lines)", grid);
      expect(lines, 'boundary lines stay inside the sized wrapper').toBeGreaterThan(grid);
      expect(lines - wrapper).toBeLessThan(700);
    }
    const host = readFileSync('ui_font_library_module.js', 'utf8');
    expect(host).toMatch(/@media \(max-width: 768px\) \{\s*button, \[role="button"\], a\[href\], select/);
  });
});
