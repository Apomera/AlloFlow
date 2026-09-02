import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Object-shaped resources in the text-only export lanes (2026-09-02).
//
// The slides preview used to dump `JSON.stringify(item.data)` for any resource
// without a dedicated branch, which put lesson source excerpts, learner
// evidence and base64 media on slides; the NotebookLM Markdown emitted an
// empty "## Section" for the same resources. Both lanes now go through one
// deny-listed summarizer (window.AlloModules.ExportHandlers.summarizeResourceText).

let handlers;

beforeAll(() => {
  loadAlloModule('export_handlers_module.js');
  handlers = window.AlloModules.ExportHandlers;
});

const appliedChallenge = {
  id: 'ac-1',
  type: 'applied-challenge',
  title: 'Bridge Decision',
  data: {
    schemaVersion: 1,
    resourceId: 'PRIVATE_RESOURCE_ID',
    family: 'decide',
    sourceExcerpt: 'PRIVATE_SOURCE_EXCERPT',
    lessonRef: { sourceTextSnippet: 'PRIVATE_SNIPPET', generatedAt: '2026-09-02T00:00:00Z' },
    brief: {
      context: 'The town must choose a bridge design under budget.',
      role: 'City engineer',
      drivingQuestion: 'Which design best balances cost and safety?',
      lockedLessonFacts: ['Steel resists tension well.'],
    },
    workspace: { framing: 'Student framing text', images: ['data:image/png;base64,' + 'A'.repeat(300)] },
    feedback: { strength: 'PRIVATE_FEEDBACK' },
  },
};

const noteTaking = {
  id: 'nt-1',
  type: 'note-taking',
  title: 'Cornell notes',
  data: { templateType: 'cornell-notes', cues: [{ text: 'What is erosion?' }], notes: [{ text: 'Wearing away of rock by water and wind.' }], summary: 'Erosion moves material.', feedbackCount: 2 },
};

const anchorChart = {
  id: 'anc-1',
  type: 'anchor-chart',
  title: 'Writing process',
  data: { chartType: 'process', sections: [{ label: 'Plan', bullets: ['Brainstorm ideas', 'Pick a focus'], icon: 'data:image/png;base64,QUJD' }, { label: 'Draft', bullets: ['Write freely'] }] },
};

describe('summarizeResourceText', () => {
  it('extracts readable text and never private, identifying, or media fields', () => {
    const lines = handlers.summarizeResourceText(appliedChallenge, { maxChars: 2000 });
    const text = lines.join('\n');
    expect(text).toContain('The town must choose a bridge design under budget.');
    expect(text).toContain('Which design best balances cost and safety?');
    expect(text).toContain('Steel resists tension well.');
    expect(text).toContain('Student framing text');
    for (const secret of ['PRIVATE_SOURCE_EXCERPT', 'PRIVATE_SNIPPET', 'PRIVATE_FEEDBACK', 'PRIVATE_RESOURCE_ID', 'AAAAAAAA', 'decide', '2026-09-02']) {
      expect(text).not.toContain(secret);
    }
    expect(text).not.toContain('{');
  });

  it('labels nested fields, keeps plain text keys bare, and respects the character budget', () => {
    const lines = handlers.summarizeResourceText(noteTaking, { maxChars: 60 });
    expect(lines.reduce((total, line) => total + line.length, 0)).toBeLessThanOrEqual(60);
    const full = handlers.summarizeResourceText(noteTaking, { maxChars: 2000 }).join('\n');
    expect(full).toContain('What is erosion?');
    expect(full).toContain('Erosion moves material.');
    expect(full).not.toContain('cornell');
    expect(full).not.toContain('2');
    expect(handlers.summarizeResourceText({ type: 'simplified', data: 'Plain passage text.' })).toEqual(['Plain passage text.']);
    expect(handlers.summarizeResourceText({ type: 'x', data: null })).toEqual([]);
  });
});

describe('slides preview for object-shaped resources', () => {
  const render = (items) => handlers.getSlidesPreviewHTML({ sourceTopic: 'Topic', gradeLevel: '6', getExportableHistory: () => items });
  const bodyText = (html) => new DOMParser().parseFromString(html, 'text/html').body.textContent;

  it('never renders raw JSON or private fields for a resource without a dedicated branch', () => {
    const text = bodyText(render([appliedChallenge, noteTaking]));
    expect(text).not.toContain('{"');
    expect(text).not.toContain('PRIVATE_SOURCE_EXCERPT');
    expect(text).not.toContain('PRIVATE_SNIPPET');
    expect(text).not.toContain('PRIVATE_FEEDBACK');
    expect(text).not.toMatch(/AAAAAAAA/);
    expect(text).toContain('The town must choose a bridge design under budget.');
    expect(text).toContain('What is erosion?');
  });

  it('renders anchor charts one section per slide without icons', () => {
    const html = render([anchorChart]);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const slides = Array.from(doc.querySelectorAll('.slide')).map((s) => s.textContent);
    expect(slides.filter((s) => s.includes('Writing process'))).toHaveLength(2);
    expect(html).toContain('Brainstorm ideas');
    expect(html).toContain('Write freely');
    expect(html).not.toContain('QUJD');
  });
});

describe('sibling lanes and registries', () => {
  it('NotebookLM falls back to the shared summarizer instead of an empty heading', () => {
    const source = readFileSync(resolve(process.cwd(), 'view_export_preview_source.jsx'), 'utf8');
    const fallback = source.indexOf("const tx = (d && (d.text || d.content || d.summary)) || '';");
    expect(fallback).toBeGreaterThan(-1);
    const slice = source.slice(fallback, fallback + 1500);
    expect(slice).toContain('summarizeResourceText(it, { maxChars: 4000 })');
    expect(slice).not.toContain('JSON.stringify');
  });

  it('builder export titles cover the four studios', () => {
    const source = readFileSync(resolve(process.cwd(), 'export_source.jsx'), 'utf8');
    for (const type of ['note-taking', 'anchor-chart', 'memory-aid', 'applied-challenge']) {
      expect(source).toContain(`case '${type}': return t('help_mode.tool_${type.replace(/-/g, '_')}')`);
    }
  });

  it('Memory Aid panel controls carry help keys that exist in help_strings.js', () => {
    const module = readFileSync(resolve(process.cwd(), 'memory_aid_source.jsx'), 'utf8');
    const help = readFileSync(resolve(process.cwd(), 'help_strings.js'), 'utf8');
    const keys = Array.from(module.matchAll(/data-help-key="([a-z_]+)"/g)).map((m) => m[1]);
    expect(keys.sort()).toEqual(['memory_aid_authorship', 'memory_aid_count', 'memory_aid_generate_button', 'memory_aid_instructions', 'memory_aid_reasoning', 'memory_aid_selection']);
    for (const key of keys) expect(help).toMatch(new RegExp("^\\s*'" + key + "':\\s*\"", 'm'));
  });
});
