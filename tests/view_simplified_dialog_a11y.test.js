import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'view_simplified_source.jsx'), 'utf8');
const built = readFileSync(resolve(process.cwd(), 'view_simplified_module.js'), 'utf8');
const deployed = readFileSync(resolve(process.cwd(), 'prismflow-deploy/public/view_simplified_module.js'), 'utf8');

describe('Simplified View layered accessibility', () => {
  it('keeps built and deployed modules synchronized', () => {
    expect(deployed).toBe(built);
    expect(built).toContain('containSimplifiedModalFocus');
  });

  it('focus-manages Immersive Reader without intercepting nested dialogs', () => {
    expect(source).toContain('ref={immersiveDialogRef} role="dialog" aria-modal="true"');
    expect(source).toContain('containSimplifiedModalFocus(e, immersiveDialogRef.current, handleCloseImmersiveReader)');
    expect(source).toContain("e.target.closest('[role=\"dialog\"]')");
    expect(source).toContain("querySelector('button[aria-label]')");
  });

  it('focus-manages phonics and removes the fake keyboard backdrop', () => {
    expect(source).toContain('ref={phonicsDialogRef} role="dialog" aria-modal="true"');
    expect(source).toContain('ref={phonicsCloseRef} type="button"');
    expect(source).toContain('containSimplifiedModalFocus(e, phonicsDialogRef.current, closePhonics)');
    expect(source).toContain('{phonicsData && <div aria-hidden="true"');
    expect(source).not.toContain('{phonicsData && <div role="button" tabIndex={0}');
  });

  it('announces cloze completion without moving focus', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"><ConfettiExplosion');
    expect(source).toContain('Activity Complete!');
    expect(source).toContain('motion-reduce:animate-none motion-reduce:transition-none');
  });

  it('provides Enter and Space activation for scanner-reported word controls', () => {
    expect(source.match(/e\.key === 'Enter' \|\| e\.key === ' '/g).length).toBeGreaterThanOrEqual(5);
  });
});