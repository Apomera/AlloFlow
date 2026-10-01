import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('misc_components_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('misc_components_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/misc_components_module.js', 'utf8');

describe('Misc Components WCAG behavior', () => {
  it('honors both app and operating-system reduced-motion preferences', () => {
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain('disableAnimations || prefersReducedMotion');
    // The real invariant, checked per className instead of pinned counts
    // (the counts churned on every compliant addition and would PASS a
    // violating replacement): any chunk that animates or transitions must
    // carry its motion-reduce partner in the same chunk.
    const chunks = [];
    const re = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g;
    let m;
    while ((m = re.exec(source)) !== null) chunks.push(m[1] != null ? m[1] : m[2]);
    expect(chunks.length).toBeGreaterThan(100); // regex sanity: the scan found the file
    for (const c of chunks) {
      if (/\banimate-(?!none)[a-z-]+/.test(c.replace(/motion-reduce:animate-none/g, ''))) {
        expect(c, `animate without motion-reduce partner: ${c.slice(0, 110)}`).toContain('motion-reduce:animate-none');
      }
      if (/\btransition-[a-z-]+/.test(c.replace(/motion-reduce:transition-none/g, ''))) {
        expect(c, `transition without motion-reduce partner: ${c.slice(0, 110)}`).toContain('motion-reduce:transition-none');
      }
    }
  });

  it('announces Cloze validation without relying on color or animation', () => {
    expect(source).toContain("aria-invalid={status === 'error'}");
    expect(source).toContain('<span role="status" aria-live="polite" className="sr-only">');
    expect(source).toContain('Incorrect answer. Try again.');
    expect(source).toContain('Correct answer.');
  });

  it('uses explicit non-submit types for every native button', () => {
    // Loop-only: EVERY button is checked, however many exist — an exact
    // count adds nothing but churn on each compliant addition.
    const buttons = source.match(/<button\b[\s\S]*?>/g) || [];
    expect(buttons.length).toBeGreaterThan(20); // regex sanity
    for (const button of buttons) expect(button).toContain('type="button"');
  });

  it('uses a dedicated named button to expand each word card', () => {
    expect(source).not.toContain('className="p-4 flex items-center justify-between cursor-pointer"');
    expect(source).toContain('aria-controls={`word-sounds-details-${idx}`}');
    expect(source).toContain('aria-expanded={expandedIndex === idx}');
    expect(source).toContain('id={`word-sounds-details-${idx}`}');
  });

  it('documents keyboard alternatives beside both draggable interactions', () => {
    expect(source.match(/data-keyboard-alternative=/g)).toHaveLength(2);
    expect(source).toContain('Use the Move earlier and Move later buttons');
    expect(source).toContain('Activate this button to add the sound');
  });

  it('uses cancellable readiness scheduling rather than a user-facing timer', () => {
    expect(source).not.toContain('setInterval(');
    expect(source).toContain('pollTimer = setTimeout(pollAudioReadiness, 1000)');
    expect(source).toContain('cancelled = true');
  });

  it('keeps generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('prefersReducedMotion');
    expect(moduleSource).toContain('data-keyboard-alternative');
    expect(publicModule).toBe(moduleSource);
  });
});
