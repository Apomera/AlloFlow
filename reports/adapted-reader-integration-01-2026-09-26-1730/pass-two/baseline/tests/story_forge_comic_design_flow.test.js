import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'story_forge_source.jsx'), 'utf8');
const designStart = source.indexOf("{phase === 'illustrate' && (");
const publishStart = source.indexOf("{phase === 'export' && (");
const design = source.slice(designStart, publishStart);
const publish = source.slice(publishStart);

describe('StoryForge Comic Design and Publish responsibilities', () => {
  it('keeps structural comic production controls in one focused Design workbench', () => {
    expect(designStart).toBeGreaterThanOrEqual(0);
    expect(publishStart).toBeGreaterThan(designStart);
    expect(design).toContain('data-sf-comic-production-workbench');
    expect(design).toContain('Comic production workbench');
    expect(design).toContain('data-sf-comic-page-composer');
    expect(design).toContain('data-sf-comic-print-safety');
    expect(design).toContain('data-sf-comic-layout-studio');
    expect(design).toContain('data-sf-comic-design-preview');
    expect(design).toContain("ta('a11y.storyforge_ui_interactive_page_preview')");
    expect(design).toContain('open={showComicProduction}');
    expect(design).toContain('onToggle={(event) => setShowComicProduction(event.currentTarget.open)}');
  });

  it('leaves Publish with proof, preview, and a route back to Design instead of production editors', () => {
    expect(publish).toContain('data-sf-comic-export-proof');
    expect(publish).toContain('data-sf-publish-design-route');
    expect(publish).toContain('data-sf-edit-comic-production');
    expect(publish).toContain('Edit production in Design');
    expect(publish).toContain("changePhase('illustrate', 'sf-comic-production-workbench')");
    expect(publish).not.toContain('data-sf-comic-page-composer');
    expect(publish).not.toContain('data-sf-comic-print-safety');
    expect(publish).not.toContain('data-sf-comic-layout-studio');
    expect(publish).not.toContain('COMIC_PANELS_PER_PAGE_OPTIONS.map');
    expect(publish).not.toContain('COMIC_PANEL_FRAME_OPTIONS.map');
  });

  it('enables drag and resize controls only in the Design preview', () => {
    expect(source).toContain('pageForPanel = null, editable = false');
    expect(source).toContain('{editable && (');
    expect(source).toContain('{editable && <button');
    expect(design).toMatch(/renderComicPreviewPanel\([^\n]+focusedComicPreviewPage, true\)/);
    expect(publish).toMatch(/renderComicPreviewPanel\(paragraph, panelIdx, page\.layout, pageIndex, page\)\)}/);
    expect(publish).not.toMatch(/renderComicPreviewPanel\([^\n]+, true\)/);
  });

  it('routes production readiness fixes to Design without mutating the Publish proof', () => {
    expect(source).toContain("return 'Open lettering tools'");
    expect(source).toContain("return 'Open print setup'");
    expect(source).toContain("changePhase('illustrate', 'sf-comic-page-composer')");
    expect(source).toContain("changePhase('illustrate', 'sf-comic-print-safety')");
    expect(source).not.toContain("addToast('Print bleed enabled.'");
  });
});
