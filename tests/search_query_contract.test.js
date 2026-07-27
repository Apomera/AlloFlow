import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Gemini Canvas cannot use google_search grounding, so AlloFlow fetches results
// client-side and injects them. That moved responsibility for the WEB QUERY from
// the model to the caller — and every call site kept relying on the model.
// WebSearchProvider._extractSearchQuery regex-scrapes the prompt as a fallback,
// which shipped three silent failures:
//
//   Find standards        searched "main ideas"          (lost grade + framework)
//   Timeline topic mode   searched "title"               (lifted from a JSON example)
//   Cinematic scene       searched "comparison"          (the scene type)
//
// None of these throw. Search "succeeds", returns irrelevant results, and the
// feature quietly produces nothing useful — or attaches sources that imply
// verification. These tests pin both the gate and the specific fixes.

const repo = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(repo, p), 'utf8');

describe('search-grounded call sites supply their own query', () => {
  it('passes the repo-wide gate', () => {
    // Fails loudly with the offending file:line if a new grounded call site
    // lands without a query.
    const out = execFileSync('node', ['dev-tools/check_search_queries.cjs'], {
      cwd: repo,
      encoding: 'utf8',
    });
    expect(out).toMatch(/✓ check_search_queries/);
  });

  it('is wired into deploy.sh so it actually blocks a ship', () => {
    // A gate that no pipeline runs is decorative.
    expect(read('deploy.sh')).toContain('node dev-tools/check_search_queries.cjs');
  });
});

describe('the three fixed call sites', () => {
  it('timeline topic-mode research searches the topic, not "title"', () => {
    const src = read('timeline_studio_module.js');
    expect(src).toContain('var researchQuery = [String(topicText || \'\').slice(0, 160)');
    // The 5th arg must actually be passed to callGemini.
    expect(src).toMatch(/buildTopicResearchPrompt\([^)]*\), false, true, 0\.3, researchQuery \|\| null\)/);
  });

  it('timeline grounded verify searches the events, not the ordering principle', () => {
    const src = read('timeline_studio_module.js');
    expect(src).toContain('e.text.headline');
    expect(src).toMatch(/callGemini\(prompt, false, true, 0\.2, verifyQuery \|\| null\)/);
  });

  it('cinematic swarm stages pass the topic through', () => {
    const src = read('cinematic_studio_module.js');
    expect(src).toMatch(/function callSwarmStage\(callGemini, stageLabel, prompt, searchQuery\)/);
    expect(src).toMatch(/callGemini\(prompt, false, true, null, searchQuery \|\| null\)/);
    // Both stages must supply it, or the scene stage searches its scene type.
    expect(src).toContain("'Stage 2 (outline)', prompt, f && f.topic");
    expect(src).toContain("prompt, f && f.topic)");
  });
});

describe('text-only tasks do not spend a web search', () => {
  // Serper's free tier is a one-time credit, and these three tasks have no
  // retrieval need at all — one of them is a translation, where injected web
  // evidence actively works against "same lines, same order".
  it('cinematic prompt refiners and caption translation run ungrounded', () => {
    const src = read('cinematic_studio_module.js');
    // The two prompt refiners.
    expect(src).not.toMatch(/callGemini\(meta, false, true\)/);
    expect(src).toMatch(/callGemini\(meta, false, false\)/);
    // Caption translation.
    expect(src).not.toMatch(/callGemini\(prompt, false, true\)\s*;/);
    expect(src).toMatch(/callGemini\(prompt, false, false\)/);
  });

  it('leaves no bare 3-argument grounded call in cinematic', () => {
    // `callGemini(x, false, true)` with no 4th/5th arg is the shape that falls
    // back to prompt-scraping. The gate catches this repo-wide; pinned here too
    // because this file had four of them.
    const src = read('cinematic_studio_module.js');
    expect(src).not.toMatch(/callGemini\([A-Za-z_$][\w$]*,\s*false,\s*true\s*\)/);
  });
});
