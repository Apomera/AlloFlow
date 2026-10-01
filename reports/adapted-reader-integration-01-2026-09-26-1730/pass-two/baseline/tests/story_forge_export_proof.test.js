import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'story_forge_source.jsx'), 'utf8');
const built = readFileSync(resolve(process.cwd(), 'story_forge_module.js'), 'utf8');
const deployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/story_forge_module.js'), 'utf8');

describe('Story Forge comic export proofing', () => {
  it('derives bounded page-level production risks from the existing page stats', () => {
    expect(source).toContain('const getComicExportProof = (pages = [], context = {}) =>');
    expect(source).toContain("key: 'bleed-off'");
    expect(source).toContain("key: 'page-turn-unset'");
    expect(source).toContain("key: 'missing-alt-text'");
    expect(source).toContain('blockingCount:');
    expect(source).toContain('const getComicContinuityAudit = (paragraphs = [], context = {}) =>');
    expect(source).toContain('untracked-speakers');
    expect(source).toContain('aliases: typeof value.aliases');
    expect(source).toContain('Also known as:');
    expect(source).toContain('matchesReference');
    expect(source).toContain('const getImageBase64Payload = (value) =>');
    expect(source).toContain('getComicConsistencyReference');
  });

  it('surfaces proof status and page-jump actions in the composer', () => {
    expect(source).toContain('const comicExportProof = useMemo');
    expect(source).toContain('data-sf-comic-export-proof');
    expect(source).toContain("aria-label={'Review export proof for page ' + row.page}");
    expect(source).toContain('panelTargetsByIssue');
    expect(source).toContain('focusComicProofTarget');
    expect(source).toContain('data-sf-comic-panel-proof-target');
    expect(source).toContain('target?.id');
    expect(source).toContain('data-sf-continuity-audit');
    expect(source).toContain("['aliases','Also known as','Min, Captain M']");
    expect(source).toContain('focusComicProofTarget(target?.page || 1, target?.id)');
    expect(source).toContain('Every page clears the current art, lettering, accessibility, pacing, and print checks.');
  });

  it('includes the same proof model in the printable production pack', () => {
    expect(source).toContain('const proof = getComicExportProof(packPages,');
    expect(source).toContain('const pageProofHtml = proof.rows.map');
    expect(source).toContain('const pageProofVisualHtml = packPages.map');
    expect(source).toContain('<h2>Rendered Page Proofs</h2>');
    expect(source).toContain('page-proof-canvas format-');
    expect(source).toContain('page-proof-safe');
    expect(source).toContain('page-proof-gutter');
    expect(source).toContain('page-proof-art');
    expect(source).toContain('<h2>Export Proof</h2>');
    expect(source).toContain('<h2>Continuity Audit</h2>');
    expect(source).toContain('continuityAuditStatus: continuityAudit?.status || null,');
    expect(source).toContain('<span>Pages clear</span>');
    expect(source).toContain('proof-global');
    expect(source).toContain('proofStatus: proof?.status || null,');
    expect(source).toContain('proofBlockingCount: proof?.blockingCount || 0,');
    expect(deployed).toBe(built);
  });
});