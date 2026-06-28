// Tier 1 deterministic FOUNDATIONS backstop (maintainer ask, 2026-06-24): when the AI-directed structural
// fixes (fix_add_landmark / fix_skip_nav / fix_title / fix_lang) don't fire on an atypical document, a
// deterministic pass should still guarantee the universal foundations — a single <main>, a skip-to-content
// link, a <title>, <meta charset>, and an <html lang> fallback. It must be FRAGMENT-SAFE (a chunk fragment
// with no <body> is left alone) and IDEMPOTENT (each step gated on absence). Markup mirrors the AI-directed
// fixes so output is consistent regardless of which path added them.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// ── extract the self-contained, pure helper ──
const _s = dp.indexOf('function fixLandmarkFoundations(html) {');
const _e = dp.indexOf('\n}', _s) + 2;
const fixLandmarkFoundations = new Function(dp.slice(_s, _e) + '\nreturn fixLandmarkFoundations;')();

const dom = (s) => new DOMParser().parseFromString(s, 'text/html');

describe('fixLandmarkFoundations: Tier 1 deterministic foundations backstop', () => {
  const bare = '<!DOCTYPE html><html><head></head><body><h1>Weekly Worksheet</h1><p>Body text.</p></body></html>';

  it('wraps body content in a single <main id="main-content" role="main"> when none exists', () => {
    const d = dom(fixLandmarkFoundations(bare));
    const mains = d.querySelectorAll('main');
    expect(mains.length).toBe(1);
    expect(mains[0].id).toBe('main-content');
    expect(mains[0].getAttribute('role')).toBe('main');
    expect(mains[0].querySelector('h1').textContent).toBe('Weekly Worksheet'); // content moved inside
    expect(mains[0].querySelector('p').textContent).toBe('Body text.');
  });

  it('adds a skip-to-content link targeting #main-content as the first body child', () => {
    const d = dom(fixLandmarkFoundations(bare));
    const a = d.querySelector('a[href="#main-content"]');
    expect(a).toBeTruthy();
    expect(a.textContent).toMatch(/skip to main content/i);
    expect(d.body.querySelector('a, main').tagName.toLowerCase()).toBe('a'); // precedes <main>
  });

  it('derives <title> from the first <h1> when <head> has none', () => {
    expect(dom(fixLandmarkFoundations(bare)).querySelector('title').textContent).toBe('Weekly Worksheet');
  });

  it('adds <meta charset> when <head> has none', () => {
    const meta = dom(fixLandmarkFoundations(bare)).querySelector('meta[charset]');
    expect(meta).toBeTruthy();
    expect(meta.getAttribute('charset').toLowerCase()).toBe('utf-8');
  });

  it('adds <html lang="en"> as a fallback when lang is entirely absent', () => {
    expect(dom(fixLandmarkFoundations(bare)).documentElement.getAttribute('lang')).toBe('en');
  });

  it('is idempotent — running twice yields byte-identical output (one main / skip-link / title)', () => {
    const once = fixLandmarkFoundations(bare);
    const twice = fixLandmarkFoundations(once);
    expect(twice).toBe(once);
    const d = dom(twice);
    expect(d.querySelectorAll('main').length).toBe(1);
    expect(d.querySelectorAll('a[href="#main-content"]').length).toBe(1);
    expect(d.querySelectorAll('title').length).toBe(1);
  });

  it('FRAGMENT-SAFE: a body-inner fragment (no <body>) is returned byte-for-byte unchanged', () => {
    const frag = '<h2>Section</h2><p>Just inner content, no document shell.</p>';
    expect(fixLandmarkFoundations(frag)).toBe(frag);
  });

  it('does NOT double-wrap an existing <main>; gives it id="main-content" if missing', () => {
    const withMain = '<html lang="en"><head><title>T</title></head><body><main role="main"><p>x</p></main></body></html>';
    const d = dom(fixLandmarkFoundations(withMain));
    expect(d.querySelectorAll('main').length).toBe(1);   // not double-wrapped
    expect(d.querySelector('main').id).toBe('main-content');
  });

  it('respects an existing role="main" element (no second main landmark forced)', () => {
    const withRole = '<html lang="en"><head><title>T</title></head><body><div role="main" id="main-content"><p>x</p></div></body></html>';
    expect(dom(fixLandmarkFoundations(withRole)).querySelectorAll('main').length).toBe(0);
  });

  it('does NOT overwrite an existing <html lang> or <title>', () => {
    const doc = '<html lang="es"><head><title>Hoja</title></head><body><h1>Otra</h1></body></html>';
    const d = dom(fixLandmarkFoundations(doc));
    expect(d.documentElement.getAttribute('lang')).toBe('es'); // unchanged
    expect(d.querySelector('title').textContent).toBe('Hoja'); // unchanged
  });

  it('does not add a second skip-link if one already exists', () => {
    const doc = '<html lang="en"><head><title>T</title></head><body><a href="#main-content">Skip to content</a><main id="main-content"><p>x</p></main></body></html>';
    expect(dom(fixLandmarkFoundations(doc)).querySelectorAll('a[href="#main-content"]').length).toBe(1);
  });

  it('null / empty / non-string inputs pass through safely', () => {
    expect(fixLandmarkFoundations(null)).toBe(null);
    expect(fixLandmarkFoundations('')).toBe('');
    expect(fixLandmarkFoundations(undefined)).toBe(undefined);
  });
});

describe('anti-drift: fixLandmarkFoundations is wired into the deterministic WCAG pass', () => {
  it('is defined and called (first) in runDeterministicWcagFixes', () => {
    expect(dp).toContain('function fixLandmarkFoundations(html)');
    expect(dp).toContain('result = fixLandmarkFoundations(result);');
  });
});
