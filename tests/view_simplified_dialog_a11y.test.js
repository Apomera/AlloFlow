import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'view_simplified_source.jsx'), 'utf8');
const built = readFileSync(resolve(process.cwd(), 'view_simplified_module.js'), 'utf8');
const deployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_simplified_module.js'), 'utf8');

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

  it('focus-manages definition and revision dialogs without fake keyboard backdrops', () => {
    expect(source).toContain('ref={definitionDialogRef} role="dialog" aria-modal="true" aria-labelledby="simplified-definition-title"');
    expect(source).toContain('containSimplifiedModalFocus(e, definitionDialogRef.current, closeDefinition)');
    expect(source).toContain('ref={definitionCloseRef} type="button"');
    expect(source).toContain('if (definitionCloseRef.current) definitionCloseRef.current.focus()');
    expect(source).toContain('ref={revisionDialogRef} role="dialog" aria-modal="true" aria-labelledby="simplified-revision-title"');
    expect(source).toContain('containSimplifiedModalFocus(e, revisionDialogRef.current, closeRevision)');
    expect(source).toContain('ref={revisionCloseRef} type="button"');
    expect(source).toContain('if (revisionCloseRef.current) revisionCloseRef.current.focus()');
    expect(source).toContain('{definitionData && <div aria-hidden="true"');
    expect(source).toContain('{revisionData && <div aria-hidden="true"');
    expect(source).not.toContain('{definitionData && <div role="button" tabIndex={0}');
    expect(source).not.toContain('{revisionData && <div role="button" tabIndex={0}');
  });

  it('provides large focus-visible Definition and Revision actions', () => {
    expect(source.match(/min-h-11 min-w-11/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain("type=\"button\" aria-label={t('common.apply_text_revision')}");
    expect(source).toContain('min-h-11 w-full bg-indigo-600');
    expect(source).toContain('motion-reduce:animate-none motion-reduce:transition-none');
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
