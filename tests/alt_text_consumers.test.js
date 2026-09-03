import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Alt-text contract across the image-bearing tools (2026-09-03).
// - Generated images are described from the drawn pixels through the shared
//   service (one batched call per resource, resource language, provenance).
// - Icons that sit next to their visible label are decorative (alt="").
// - Exports carry the same descriptions, animated panels export a poster, and
//   the remediation quality scanner finds no high-severity alt in any lane.
// - Glossary translation columns follow the universal output language.

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const src = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

let pipeline;
let scan;

beforeAll(() => {
  window.React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('alt_text_module.js');
  loadAlloModule('memory_aid_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
    t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
  });
  scan = window.AlloModules.createDocPipeline.scanAltQuality;
});

const exportHtml = (items, worksheet = false) => pipeline.generateFullPackHTML(items, 'Alt gate', worksheet, {}, { includeTeacherKey: false, annotations: [] });
const imgs = (html) => Array.from(new DOMParser().parseFromString(html, 'text/html').querySelectorAll('img'));

describe('generation describes the drawn pixels', () => {
  const dispatcher = src('generate_dispatcher_source.jsx');

  it('drafts alt text once per resource through the shared service, in the resource language, with provenance', () => {
    expect(dispatcher).toContain('const _draftAltsFor = async (targets, language) =>');
    expect(dispatcher).toContain("svc.draftAlts(images, { language, callGeminiVision");
    expect(dispatcher).not.toContain('"Educational diagram."');
    // single image, multi-panel plan, and timeline cards all go through it
    expect((dispatcher.match(/_draftAltsFor\(/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(dispatcher).toContain("content.altSource = 'planning';");
    expect(dispatcher).toContain("memoryAidRules.visualCheckPrompt(card, { language: effectiveLanguage })");
    expect(dispatcher).toContain("card.visualAltSource = 'vision';");
  });

  it('glossary translation columns follow the universal output language, English base column kept', () => {
    const start = dispatcher.indexOf("const _glossaryOutput = String(leveledTextLanguage || 'English')");
    expect(start).toBeGreaterThan(-1);
    const block = dispatcher.slice(start, start + 900);
    expect(block).toContain("/^all selected languages$/i.test(_glossaryOutput)");
    expect(block).toContain("[...(Array.isArray(selectedLanguages) ? selectedLanguages : [])]");
    expect(block).toContain("(/^english$/i.test(_glossaryOutput) ? [] : [_glossaryOutput])");
    expect(block).not.toContain('langsReq = [];');
    // The panel chip and the help copy describe the same rule.
    const panel = src('view_sidebar_panels_source.jsx');
    expect(panel).toContain("/^all selected languages$/i.test(output) ? (selectedLanguages || []) : (/^english$/i.test(output) ? [] : [output])");
    expect(panel).toContain("t('glossary.follows_output_language')");
    expect(src('AlloFlowANTI.txt')).toContain('          leveledTextLanguage, selectedLanguages, setAutoRemoveWords, setGlossaryCustomInstructions,');
    expect(src('help_strings.js')).toContain('They follow the Output Language in Universal Settings');
  });

  it('fun facts work on local text backends through the web provider with cited, filtered evidence', () => {
    const start = dispatcher.indexOf('if (includeHookFacts) {');
    expect(start).toBeGreaterThan(-1);
    const block = dispatcher.slice(start, dispatcher.indexOf("addToast(t('memory_aid.toast_hook_facts_skipped')", start));
    expect(block).toContain('if (usesLocalTextBackend) {');
    expect(block).toContain("webSearchProvider.search(hookQuery + ' fun facts for students')");
    expect(block).toContain('filterEducationalSources(candidateRows.map(row => ({ web: { uri: row.url, title: row.title } })))');
    expect(block).toContain('hookResult = await callGemini(evidencePrompt, false, false);');
    expect(block).toContain("const cite = line.match(/\\[S(\\d{1,2})\\]/i);");
    expect(block).toContain("throw Object.assign(new Error('Web search provider is unavailable'), { code: 'allo/search-unavailable' });");
    expect(dispatcher).toContain('callImagen, callGeminiVision, webSearchProvider,');
    expect(src('AlloFlowANTI.txt')).toContain('        webSearchProvider: WebSearchProvider,');
  });
});

describe('edits keep descriptions honest', () => {
  it('refining an image re-describes it unless a person wrote the description; a regenerated timeline picture is marked stale', () => {
    const refine = src('phase_o_misc_handlers_source.jsx');
    expect(refine).toContain('const _redescribeImageContent = async (content, deps) =>');
    expect((refine.match(/await _redescribeImageContent\(updatedContent/g) || []).length).toBe(2);
    expect(refine).toContain("if (target.altSource === 'author') return;");
    const timeline = src('timeline_revision_source.jsx');
    expect(timeline).toContain("{ image: imageUrl, altHash: 'regenerated' }");
  });

  it('every image-bearing view offers the shared description field in teacher mode', () => {
    expect(src('view_image_source.jsx')).toContain('window.AlloModules.ImageAltField');
    expect(src('visual_panel_source.jsx')).toContain('const renderAltField = (panel, panelIdx) =>');
    expect(src('view_timeline_source.jsx')).toContain('const renderTimelineAltField = (item, idx) =>');
    const anti = src('AlloFlowANTI.txt');
    expect(anti).toContain('const handleUpdateVisualPanel = (panelIdx, patch) => {');
    expect(anti).toContain("loadModule('AltTextModule'");
  });

  it('memory aid records description provenance and asks for the lesson language', () => {
    const H = window.AlloModules.MemoryAid._testing;
    const card = { id: 'c', target: 'x', essentialFacts: ['f'], visualImage: PNG, visualAlt: 'A lake.', visualAltSource: 'vision' };
    expect(H.normalizeMemoryAidCard(card, 0, {}).visualAltSource).toBe('vision');
    const edited = H.applyMemoryAidCardPatch(H.normalizeMemoryAidCard(card, 0, {}), { visualAlt: 'A lake with a boat.' });
    expect(edited.visualAltSource).toBe('author');
    const repainted = H.applyMemoryAidCardPatch(H.normalizeMemoryAidCard(card, 0, {}), { visualImage: 'data:image/png;base64,QkJCQg==' });
    expect(repainted.visualAltSource).toBe('');
    expect(window.AlloModules.MemoryAid.exportRules.visualCheckPrompt(card, { language: 'Spanish' })).toContain('Write suggestedAlt in Spanish');
  });
});

describe('icons next to their label are decorative', () => {
  it('in the live views', () => {
    const glossary = src('view_glossary_source.jsx');
    expect(glossary).not.toContain('alt={`${item.term} icon`}');
    expect(glossary).not.toContain('alt="Visual"');
    expect((glossary.match(/alt="" role="presentation"/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(src('anchor_charts_source.jsx')).toContain('<img src={iconUrl} alt="" role="presentation"');
  });
});

describe('exports', () => {
  it('glossary icons are decorative and timeline pictures carry their description', () => {
    const glossary = { id: 'g1', type: 'glossary', title: 'Words', data: [{ term: 'Volcano', def: 'A mountain that erupts.', tier: 'Academic', image: PNG }] };
    const timeline = { id: 't1', type: 'timeline', title: 'Events', data: { items: [{ date: '1969', event: 'Moon landing', content: 'Moon landing', image: PNG, alt: 'An astronaut stands beside a lunar module.' }] } };
    const html = exportHtml([glossary, timeline]);
    const list = imgs(html);
    expect(list.length).toBeGreaterThanOrEqual(2);
    const glossaryImg = list.find(img => img.getAttribute('src') === PNG && img.getAttribute('alt') === '');
    expect(glossaryImg).toBeTruthy();
    expect(glossaryImg.getAttribute('role')).toBe('presentation');
    expect(list.some(img => img.getAttribute('alt') === 'An astronaut stands beside a lunar module.')).toBe(true);
    expect(html).not.toContain('alt="Volcano"');
    const report = scan(html);
    expect(report.highCount).toBe(0);
  });

  it('a single image exports its description and a multi-panel animation exports a poster frame with a note', () => {
    const single = { id: 'i1', type: 'image', title: 'Cell', data: { prompt: 'diagram of a cell', imageUrl: PNG, altText: 'A plant cell with a labelled nucleus and cell wall.', altSource: 'vision' } };
    const panels = { id: 'i2', type: 'image', title: 'Mitosis', data: { prompt: 'mitosis', imageUrl: PNG, altText: 'Chromosomes line up at the centre of a cell.', visualPlan: { layout: 'grid', title: 'Mitosis', panels: [
      { id: 'p1', imageUrl: PNG, caption: 'Metaphase', alt: 'Chromosomes line up at the centre of a cell.', altSource: 'vision' },
      { id: 'p2', type: 'process_animation', imageUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', frames: [PNG, PNG, PNG], fps: 3, motionPrompt: 'the cell pinches in two', caption: 'Cytokinesis', alt: 'A cell pinched in the middle, about to split.', altSource: 'vision' },
    ] } } };
    const html = exportHtml([single, panels]);
    expect(html).toContain('alt="A plant cell with a labelled nucleus and cell wall."');
    expect(html).toContain('alt="A cell pinched in the middle, about to split."');
    expect(html).not.toContain('src="data:image/gif;base64,R0lGODlhAQABAAAAACw="');
    expect(html).toContain('3 frames');
    expect(scan(html).highCount).toBe(0);
  });

  it('the memory-aid lanes still pass the same scanner', () => {
    const memoryAid = { id: 'm1', type: 'memory-aid', title: 'Water', data: { instructions: 'x', reflectionLevel: 'quick', reasoningRequired: false, cards: [{ id: 'c1', target: 'Water cycle', essentialFacts: ['Water evaporates when heated.'], type: 'story-chain', mode: 'generated', aiExample: 'Sun lifts water.', factLocked: true, factVerified: true, visualImage: PNG, visualAlt: 'Sun over a lake with a cloud and rain.', visualAltSource: 'vision', visualSource: 'ai-generated' }] } };
    expect(scan(exportHtml([memoryAid])).highCount).toBe(0);
    expect(scan(exportHtml([memoryAid], true)).highCount).toBe(0);
  });
});
