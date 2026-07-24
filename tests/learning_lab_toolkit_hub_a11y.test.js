import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab My Toolkit Hub accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function MyToolkitHub(props) {');
  const end = source.indexOf("  window.StemLab.registerTool('learningLab'", start);
  const hub = source.slice(start, end);

  it('uses a semantic page header and focusable main heading', () => {
    expect(hub).toContain("hh('header'");
    expect(hub).toContain("hh('h1', { id: 'learning-lab-toolkit-hub-heading', tabIndex: -1");
  });

  it('frames tools as optional and contextual', () => {
    expect(hub).toContain('Browse optional planning, learning, reflection, and self-advocacy tools.');
    expect(hub).toContain('Use only what fits your goals and context.');
    expect(hub).not.toContain('Personal evidence-based learning tools.');
  });

  it('uses time semantics and locale-sensitive date text', () => {
    expect(hub).toContain("hh('time', { dateTime: todayISOv }, dateLong)");
    expect(hub).toContain("toLocaleDateString(undefined");
    expect(hub).not.toContain("toLocaleDateString('en-US'");
  });

  it('uses accurate storage framing instead of browser-only promises', () => {
    expect(hub).toContain('Storage and privacy vary by configuration');
    expect(hub).toContain('copies may exist in more than one place');
    expect(hub).not.toContain('Everything saves to your browser');
  });

  it('renders quick stats as a named description list', () => {
    expect(hub).toContain("'aria-labelledby': 'learning-lab-toolkit-hub-overview-heading'");
    expect(hub).toContain("hh('dl'");
    expect(hub).toContain("hh('dt'");
    expect(hub).toContain("hh('dd'");
  });

  it('uses explicit units in quick-stat labels', () => {
    expect(hub).toContain("label: 'Focus minutes today'");
    expect(hub).toContain("label: 'Open brain-dump items'");
    expect(hub).not.toContain("value: todayFocusMin + 'm'");
  });

  it('provides a named native search form', () => {
    expect(hub).toContain("hh('form', { role: 'search'");
    expect(hub).toContain("htmlFor: 'learning-lab-toolkit-hub-search'");
    expect(hub).toContain("type: 'search', value: query");
  });

  it('explains the searchable metadata', () => {
    expect(hub).toContain('Search tool names, descriptions, saved-status text, or actions.');
    expect(hub).toContain("'aria-describedby': 'learning-lab-toolkit-hub-search-help learning-lab-toolkit-hub-results'");
  });

  it('filters tools case-insensitively across all visible metadata', () => {
    expect(hub).toContain("query.trim().toLowerCase()");
    expect(hub).toContain("[tool.label, tool.desc, tool.stat, tool.cta].join(' ').toLowerCase()");
  });

  it('reports filtered and total counts through a live status', () => {
    expect(hub).toContain("filteredTools.length + ' of ' + TOOLS.length + ' toolkit tools shown'");
    expect(hub).toContain("id: 'learning-lab-toolkit-hub-results', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
  });

  it('provides a useful no-results state', () => {
    expect(hub).toContain('No toolkit tools match this search. Change or clear the search to show tools.');
  });

  it('provides a non-submit Clear search control', () => {
    expect(hub).toContain("type: 'button', onClick: clearSearch");
    expect(hub).toContain("}, 'Clear search')");
  });

  it('announces search clearing and restores search focus', () => {
    expect(hub).toContain("llAnnounce('Toolkit search cleared. All tools are shown.')");
    expect(hub).toContain("focusById('learning-lab-toolkit-hub-search')");
  });

  it('renders the tool grid as a semantic list', () => {
    expect(hub).toContain("hh('ul', { 'aria-label': 'Toolkit tools'");
    expect(hub).toContain("return hh('li', { key: tool.id }");
  });

  it('uses responsive card sizing without tiny columns', () => {
    expect(hub).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))'");
    expect(hub).toContain('minHeight: 150');
  });

  it('uses native buttons with full-width target areas', () => {
    expect(hub).toContain("hh('button', { type: 'button'");
    expect(hub).toContain("display: 'block', width: '100%'");
  });

  it('associates each tool description and status with its button', () => {
    expect(hub).toContain("'aria-describedby': descId + ' ' + statId");
    expect(hub).toContain("id: descId");
    expect(hub).toContain("id: statId");
  });

  it('provides explicit status and action text', () => {
    expect(hub).toContain("'Status: ' + tool.stat + '. Action: ' + tool.cta + '.'");
  });

  it('hides decorative and potentially garbled icons', () => {
    expect(hub).toContain("hh('span', { 'aria-hidden': 'true'");
  });

  it('wraps long tool names and descriptions', () => {
    expect(hub).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(hub).toContain("cursor: 'pointer', overflowWrap: 'anywhere'");
  });

  it('announces tool navigation and handles an unavailable navigator', () => {
    expect(hub).toContain("llAnnounce('Opening ' + tool.label + '.')");
    expect(hub).toContain("typeof navigate !== 'function'");
    expect(hub).toContain("llAnnounce('This toolkit tool could not be opened.')");
  });

  it('removes the inaccurate duplicate coming-soon teaser', () => {
    expect(hub).not.toContain('More tools coming');
    expect(hub).not.toContain("key: 'cs-' + i");
  });

  it('updates Weekly Reflection overclaiming', () => {
    expect(hub).toContain('Optional five-prompt weekly reflection');
    expect(hub).not.toContain('highest-evidence metacog tool');
  });

  it('updates Transition Planner framing', () => {
    expect(hub).toContain('Flexible prompts for anticipating or experiencing a change');
    expect(hub).not.toContain('Schlossberg 4-phase');
  });

  it('updates Accommodation Request framing', () => {
    expect(hub).toContain('Draft and review school, college, or workplace request messages');
    expect(hub).not.toContain('5 formal-letter templates');
  });

  it('updates Life Deck framing', () => {
    expect(hub).toContain('Choose optional gentle or deeper reflection prompts');
    expect(hub).not.toContain('Draw + answer one at a time');
  });

  it('renames Communication Style to Communication Preferences', () => {
    expect(hub).toContain("label: 'Communication Preferences'");
    expect(hub).toContain('Flexible preferences, requests, and a reviewable summary');
    expect(hub).not.toContain("label: 'Communication Style'");
  });

  it('renames Backup and Import to scoped data management', () => {
    expect(hub).toContain("label: 'Toolkit Data Management'");
    expect(hub).toContain('Review, download, import, or clear available toolkit records');
    expect(hub).not.toContain('Your data, your control.');
  });

  it('removes unsupported crisis-resource universality', () => {
    expect(hub).toContain('General resource starting points and a personal list');
    expect(hub).not.toContain('Universal crisis lines');
  });

  it('removes neurodivergence-only sensory framing', () => {
    expect(hub).toContain('Optional sensory preferences and support notes');
    expect(hub).not.toContain('preferences for ND students');
  });

  it('uses 44-pixel search controls', () => {
    expect(hub).toContain('minWidth: 44, minHeight: 44');
    expect(hub).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
