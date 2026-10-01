/**
 * Copy-integrity pins for the Educator Growth & Evaluation panel source.
 *
 * Three repo-wide passes have each damaged this file's strings once: the
 * 2026-08-18 em-dash removal left literal ', ' placeholders where dashes were
 * used as empty-value markers, a re-encode left mojibake in one button label,
 * and the 2026-08-23 i18n extraction wrapped DOM id prefixes, a CSS value, and
 * download filename prefixes in t() (translatable identifiers break
 * getElementById-based tab focus). These pins make each class loud on return.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(path.join(HERE, '..', 'educator_evaluation_source.jsx'), 'utf8');

describe('educator evaluation copy integrity', () => {
  it('contains no UTF-8 mojibake sequences', () => {
    expect(SOURCE).not.toMatch(/â€/);
    expect(SOURCE).not.toMatch(/Ã¢/);
  });

  it('contains no bare-comma empty-value placeholders from the dash sweep', () => {
    expect(SOURCE).not.toMatch(/\|\| ', '/);
    expect(SOURCE).not.toMatch(/\? ', ' :/);
  });

  it('never wraps identifiers, CSS values, or filename prefixes in t()', () => {
    const fallbacks = [];
    const call = /t\("educator_evaluation\.[a-z0-9_]+",\s*'([^']*)'\)/g;
    let match;
    while ((match = call.exec(SOURCE)) !== null) fallbacks.push(match[1]);
    expect(fallbacks.length).toBeGreaterThan(500);
    const identifierShaped = fallbacks.filter((text) =>
      /^ae-/.test(text) || /^\d+px /.test(text) || /^[a-z0-9]+(?:-[a-z0-9]+)+-$/.test(text));
    expect(identifierShaped).toEqual([]);
  });

  it('persists the in-progress walkthrough draft across unmount and reload', () => {
    expect(SOURCE).toContain("'alloflow_ae_walkthrough_draft_v1'");
    expect(SOURCE).toContain('sessionStorage.getItem(AE_WALK_DRAFT_KEY)');
    expect(SOURCE).toContain('sessionStorage.setItem(AE_WALK_DRAFT_KEY, JSON.stringify(draft))');
  });

  it('reports the full evaluator queue size, not just the visible slice', () => {
    expect(SOURCE).toContain('evaluatorQueueAll.length > evaluatorQueue.length');
    expect(SOURCE).toContain('setShowAllQueue');
  });
});
