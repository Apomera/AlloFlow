import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'view_misc_panels_source.jsx'), 'utf8');
const built = readFileSync(resolve(process.cwd(), 'view_misc_panels_module.js'), 'utf8');
const deployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_misc_panels_module.js'), 'utf8');

describe('Misc Panels dialog accessibility', () => {
  it('keeps generated and deployed artifacts synchronized', () => {
    expect(deployed).toBe(built);
    expect(built).toContain('requestDiffConfirmation');
  });

  it('focus-manages the named diff dialog', () => {
    expect(source).toContain('ref={diffDialogRef}');
    expect(source).toContain('aria-labelledby="allo-diff-title"');
    expect(source).toContain('containDiffFocus(event, diffDialogRef.current, _closeDiff)');
    expect(source).toContain('ref={diffCloseRef}');
    expect(source).toContain('diffCloseRef.current?.focus()');
  });

  it('uses an accessible nested decision dialog instead of browser confirms', () => {
    expect(source).not.toMatch(/\b(?:window\.)?confirm\s*\(/);
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain('aria-labelledby="allo-diff-confirm-title"');
    expect(source).toContain('aria-describedby="allo-diff-confirm-message"');
    expect(source).toContain('diffConfirmCancelRef.current?.focus()');
  });

  it('awaits both potentially destructive granularity decisions', () => {
    expect(source.match(/await requestDiffConfirmation\(/g)).toHaveLength(2);
    expect(source).toContain("cancelLabel: 'Keep current view'");
    expect(source).toContain("cancelLabel: 'Keep rejections'");
  });

  it('focus-manages the Group Session dialog', () => {
    expect(source).toContain('ref={groupDialogRef} tabIndex={-1} onKeyDown={containGroupFocus}');
    expect(source).toContain('aria-labelledby="group-session-title" aria-describedby="group-session-description"');
    expect(source).toContain('groupCloseRef.current?.focus()');
    expect(source).toContain("if (event.key === 'Escape') { event.preventDefault(); handleSetShowGroupModalToFalse();");
  });

  it('provides button alternatives for drag-based resource reordering', () => {
    expect(source).toContain('const moveResourceBy = async (resId, delta)');
    expect(source).toContain('onClick={() => moveResourceBy(res.id, -1)}');
    expect(source).toContain('onClick={() => moveResourceBy(res.id, 1)}');
    expect(source).toContain("aria-label={`Move ${res.title || 'resource'} earlier`}");
    expect(source).toContain("aria-label={`Move ${res.title || 'resource'} later`}");
  });
  it('provides button alternatives for 3D rotation and zoom gestures', () => {
    for (const label of ['Rotate volume left', 'Rotate volume right', 'Tilt volume up', 'Tilt volume down']) {
      expect(source).toContain(`aria-label="${label}"`);
    }
    expect(source).toContain("t('volume_builder.zoom_in_aria') || 'Zoom in'");
    expect(source).toContain("t('volume_builder.zoom_out_aria') || 'Zoom out'");
    expect(source).toContain('role="group" aria-label="Rotate 3D volume"');
    expect(source).toContain('role="img"');
    expect(source).toContain('aria-live="polite">Tilt {Math.round(cubeRotation.x)} degrees');
  });
  it('focus-manages and announces Tour Overlay steps', () => {
    expect(source).toContain('ref={tourDialogRef}');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-label={tourAccessibleTitle}');
    expect(source).toContain('onKeyDown={containTourFocus}');
    expect(source).toContain("if (event.key === 'Escape') { event.preventDefault(); closeTourOverlay();");
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true">{tourAccessibleTitle}. {tourAccessibleText}');
    expect(source).toContain('motion-reduce:animate-none motion-reduce:transition-none');
  });});