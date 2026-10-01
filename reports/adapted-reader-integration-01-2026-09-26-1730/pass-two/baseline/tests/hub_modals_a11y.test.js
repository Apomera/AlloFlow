import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const surfaces = [
  ['Learning Hub', 'view_learning_hub_modal_source.jsx', 'view_learning_hub_modal_module.js'],
  ['Educator Hub', 'view_educator_hub_modal_source.jsx', 'view_educator_hub_modal_module.js'],
];

describe.each(surfaces)('%s modal accessibility', (_name, sourcePath, modulePath) => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  it('uses a non-focusable backdrop and focusable named dialog', () => {
    expect(source).not.toContain('role="button" tabIndex={0}');
    expect(source).toContain('ref={dialogRef} tabIndex={-1}');
    expect(source).toContain('role="dialog" aria-modal="true"');
    expect(source).toMatch(/aria-(?:label|labelledby)=/);
  });
  it('contains focus, closes with Escape, and restores the trigger', () => {
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('window.__alloFocusTrapStack');
    expect(source).toContain('if (!isTopTrap()) return');
    expect(source).toContain("document.addEventListener('keydown', onKeyDown)");
    expect(source).toContain('previousFocus.isConnected');
  });
  it('synchronizes its public module', () => {
    expect(fs.readFileSync(`desktop/web-app/public/${modulePath}`, 'utf8')).toBe(fs.readFileSync(modulePath, 'utf8'));
  });
});


describe('Learning Hub launcher grid accessibility', () => {
  const source = fs.readFileSync('view_learning_hub_modal_source.jsx', 'utf8');
  it('uses visible naming, explicit controls, decorative icons, and reduced motion', () => {
    expect(source).toContain('aria-labelledby="learning-hub-title" aria-describedby="learning-hub-subtitle"');
    // The a11y invariant is that EVERY button declares an explicit type (an
    // untyped button inside a form submits it), not that there are exactly N of
    // them — adding a launcher tile is normal and used to redden this file.
    // Equality catches the real defect; the floor catches a mass deletion.
    expect(source.match(/<button\b/g).length).toBeGreaterThanOrEqual(15);
    expect(source.match(/type="button"/g).length).toBe(source.match(/<button\b/g).length);
    expect(source).toContain('min-w-11 min-h-11');
    // WCAG 2.3.3: every hover TRANSFORM needs a reduced-motion escape. Pinned as
    // a pairing, not a tally, so a new tile that correctly brings its own
    // motion-reduce class passes while one that forgets it fails. The
    // disabled:hover:scale-100 reset is excluded — it cancels motion, not causes it.
    expect(source.match(/motion-reduce:transform-none/g).length)
      .toBe((source.match(/(?<!disabled:)hover:scale-/g) || []).length);
    expect(source).not.toMatch(/<span className="text-4xl"(?![^>]*aria-hidden)/);
  });
});


describe('Educator Hub launcher grid accessibility', () => {
  const source = fs.readFileSync('view_educator_hub_modal_source.jsx', 'utf8');
  it('uses visible naming, explicit controls, reduced motion, and an announced result count', () => {
    expect(source).toContain('aria-labelledby="educator-hub-title" aria-describedby="educator-hub-subtitle"');
    expect(source.match(/<button\b/g).length).toBeGreaterThanOrEqual(19);
    expect(source.match(/type="button"/g).length).toBe(source.match(/<button\b/g).length);
    expect(source.match(/motion-reduce:transform-none/g).length)
      .toBe((source.match(/(?<!disabled:)hover:scale-/g) || []).length);
    expect(source).toContain('<p className="sr-only" aria-live="polite">{hubVisibleCount}');
    expect(source).toContain("{tr('hub.tools_available', 'tools available')}</p>");
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toMatch(/<span aria-hidden="true">[^<]+<\/span> \{t\('pdf_audit\.view_last_audit'\)/);
  });
});
