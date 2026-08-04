// Education Law Navigator — corpus integrity and the no-fabrication contract.
//
// THE INVARIANT THIS FILE EXISTS TO PROTECT: every word of regulation text the
// tool renders was fetched from the publisher and stamped, and the tool never
// substitutes remembered or generated text when the corpus is missing.
// Hallucinated law is worse than no tool, so these are hard assertions, not
// style checks.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const TOOL = 'stem_lab/stem_tool_lawnavigator.js';
const src = read(TOOL);
const manifest = JSON.parse(read('law_corpus/manifest.json'));

describe('Law Navigator corpus', () => {
  it('manifest lists documents with provenance on every entry', () => {
    expect(manifest.documents.length).toBeGreaterThanOrEqual(3);
    for (const d of manifest.documents) {
      expect(d.slug, 'slug').toBeTruthy();
      expect(d.citation, d.slug + ' citation').toBeTruthy();
      expect(d.sourceUrl, d.slug + ' sourceUrl').toMatch(/^https:\/\//);
      expect(d.publisher || d.jurisdictionName, d.slug + ' attribution').toBeTruthy();
      expect(d.retrievedAt, d.slug + ' retrievedAt').toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Ingested documents must carry real sections AND a currency date;
      // pointer documents must carry ZERO sections (never invented stubs).
      if (d.status === 'ingested') {
        expect(d.sectionCount, d.slug).toBeGreaterThan(0);
        expect(d.currentAsOf, d.slug + ' currentAsOf').toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        expect(d.sectionCount, d.slug + ' pointer must have no sections').toBe(0);
      }
    }
  });

  it('every corpus file on disk matches its manifest entry', () => {
    for (const d of manifest.documents) {
      const doc = JSON.parse(read('law_corpus/' + d.slug + '.json'));
      expect(doc.slug).toBe(d.slug);
      expect(doc.sections.length).toBe(d.sectionCount);
      expect(doc.sourceUrl).toBe(d.sourceUrl);
      expect(doc.retrievedAt).toBe(d.retrievedAt);
    }
  });

  it('federal text is real: known sections carry their actual headings', () => {
    const idea = JSON.parse(read('law_corpus/idea-part-b.json'));
    const byNum = Object.fromEntries(idea.sections.map((s) => [s.number, s]));
    // Spot-checks against sections the Parenting Lab rights card relies on.
    expect(byNum['300.111'].heading).toMatch(/child find/i);
    expect(byNum['300.502'].heading).toMatch(/independent educational evaluation/i);
    expect(byNum['300.503'].heading).toMatch(/prior notice/i);
    expect(byNum['300.530'].heading).toMatch(/authority of school personnel/i);
    // And the manifestation machinery really is in 300.530's text.
    const t530 = byNum['300.530'].paragraphs.join(' ');
    expect(t530).toMatch(/manifestation/i);
    expect(t530).toMatch(/10 school days/i);
    const s504 = JSON.parse(read('law_corpus/section-504.json'));
    expect(s504.sections.length).toBeGreaterThan(20);
  });

  it('ingested text is free of unresolved XML entities and stray markup', () => {
    for (const slug of ['idea-part-b', 'section-504']) {
      const doc = JSON.parse(read('law_corpus/' + slug + '.json'));
      const sample = doc.sections.slice(0, 40).map((s) => s.heading + ' ' + s.paragraphs.join(' ')).join(' ');
      expect(sample, slug + ' hex entity').not.toMatch(/&#x[0-9a-f]+;/i);
      expect(sample, slug + ' decimal entity').not.toMatch(/&#\d+;/);
      expect(sample, slug + ' tag').not.toMatch(/<[A-Za-z/][^>]*>/);
    }
  });

  it('every federal citation the topic bridge names exists in the corpus', () => {
    const idea = JSON.parse(read('law_corpus/idea-part-b.json'));
    const have = new Set(idea.sections.map((s) => s.number));
    const cited = [...src.matchAll(/federal:\s*\[([^\]]+)\]/g)]
      .flatMap((m) => [...m[1].matchAll(/'([\d.]+)'/g)].map((x) => x[1]));
    expect(cited.length).toBeGreaterThan(10);
    for (const c of cited) expect(have.has(c), 'topic bridge cites missing § ' + c).toBe(true);
  });
});

describe('Law Navigator no-fabrication contract', () => {
  it('the tool file contains no regulation text of its own', () => {
    // Regulation prose in the TOOL would mean text that bypassed ingestion.
    // These phrasings are unmistakably statutory and must live only in corpus JSON.
    for (const tell of [
      /\bshall\s+(?:be\s+)?(?:provide|ensure|conduct|afford)/i,
      /\bpursuant to (?:section|paragraph)\b/i,
      /\bnot later than \d+ (?:days|business days)\b/i,
      /\bas used in this part\b/i
    ]) {
      expect(src, 'statutory prose in tool source').not.toMatch(tell);
    }
  });

  it('refuses to render anything when the corpus fails to load', () => {
    // The failure branch must exist and must be explicit about WHY it is empty.
    expect(src).toMatch(/could not be loaded/i);
    expect(src).toContain('will not display anything from memory');
    // And it must not silently fall through to a default document.
    expect(src).toMatch(/if \(loadErr && !manifest\)/);
  });

  it('never renders regulation text without provenance and a currency date', () => {
    expect(src).toContain('current as of');
    expect(src).toContain('retrieved');
    expect(src).toContain('Verbatim text as published');
    // Staleness must be surfaced, not just stored.
    expect(src).toMatch(/STALE_DAYS\s*=\s*\d+/);
    expect(src).toMatch(/more than six months old/i);
  });

  it('the AI explainer is source-anchored and refuses to fill gaps', () => {
    expect(src).toContain('the ONLY source you may use');
    expect(src).toContain('This passage does not say');
    expect(src).toMatch(/do not give legal advice/i);
    expect(src).toContain('[BEGIN REGULATION PASSAGE]');
    expect(src).toContain('[END REGULATION PASSAGE]');
    // Low temperature: this is retrieval-shaped work, not creative work.
    expect(src).toMatch(/callGemini\(prompt, false, false, 0\.\d/);
    // Prompt-injection boundary: a quoted regulation is DATA, never an
    // instruction to the model.
    expect(src).toContain('UNTRUSTED SOURCE TEXT');
    // Verifiability: the model must quote the passage back so a reader can
    // check the explanation against the text on their own screen.
    expect(src).toContain('In the text:');
    // A failed explanation must leave the official text untouched and say so.
    expect(src).toMatch(/official text above is unchanged/i);
  });

  it('an un-ingested state is reported as un-ingested, never as "no rule"', () => {
    expect(src).toContain('not in the corpus yet');
    expect(src).toContain('will not paraphrase a rule it has not fetched');
    expect(src).toContain('never that the state has no rule');
  });

  it('carries a not-legal-advice disclaimer on every view', () => {
    expect(src).toMatch(/not legal advice/i);
    // `disclaimer` is appended in each returned view, so it must appear
    // in the home, compare, doc, and section branches.
    expect((src.match(/disclaimer\b/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});

describe('Law Navigator live mode', () => {
  // Lift the SHIPPED parser/decoder out of the tool and exercise them directly,
  // so these test the code that actually runs, not a copy.
  const lifted = (() => {
    const start = src.indexOf('function parseLiveSection');
    const end = src.indexOf('function fetchLiveSection');
    expect(start, 'parseLiveSection present').toBeGreaterThan(-1);
    expect(end, 'fetchLiveSection present').toBeGreaterThan(start);
    const box = {};
    new Function('box', src.slice(start, end) + '\nbox.parseLiveSection = parseLiveSection; box.decodeXml = decodeXml;')(box);
    return box;
  })();

  it('decodes hex entities, which eCFR uses heavily', () => {
    // The bug caught during ingestion: a decimal-only decoder leaves "&#xA7;"
    // on screen. Section signs and em dashes are everywhere in the CFR.
    expect(lifted.decodeXml('&#xA7; 300.530')).toBe('§ 300.530');
    expect(lifted.decodeXml('a &#x2014; b')).toBe('a — b');
    expect(lifted.decodeXml('&#8212;')).toBe('—');
    expect(lifted.decodeXml('<E T="03">emph</E> text')).toBe('emph text');
    // &amp; decoded last so &amp;#xA7; does not double-decode into a §.
    expect(lifted.decodeXml('AT&amp;T')).toBe('AT&T');
    expect(lifted.decodeXml('&amp;#xA7;')).toBe('&#xA7;');
  });

  it('extracts exactly the requested section from eCFR XML', () => {
    const xml = '<DIV8 N="300.530" TYPE="SECTION"><HEAD>&#xA7; 300.530 Authority.</HEAD>' +
      '<P>(a) First.</P><P>(b) Second.</P></DIV8>' +
      '<DIV8 N="300.531" TYPE="SECTION"><HEAD>Other</HEAD><P>(a) Not this one.</P></DIV8>';
    const got = lifted.parseLiveSection(xml, '300.530');
    expect(got.heading).toBe('§ 300.530 Authority.');
    expect(got.paragraphs).toEqual(['(a) First.', '(b) Second.']);
    expect(got.paragraphs.join(' ')).not.toMatch(/Not this one/);
    expect(lifted.parseLiveSection(xml, '300.999')).toBeNull();
  });

  it('carries the CFR part so live lookups know where to fetch', () => {
    for (const d of manifest.documents) {
      if (d.status === 'ingested') {
        expect(d.cfrPart, d.slug + ' cfrPart').toMatch(/^\d+$/);
      } else {
        // No endpoint may be guessed for a non-eCFR source.
        expect(d.cfrPart, d.slug + ' pointer must not claim a CFR part').toBeFalsy();
      }
    }
  });

  it('tries live first and falls back to the stored copy, labeling which is shown', () => {
    expect(src).toContain('Live from eCFR right now');
    expect(src).toContain('Could not reach eCFR — showing the stored copy');
    expect(src).toContain('Verbatim text, fetched live from eCFR');
    // The fallback must be the CACHED section, never nothing and never invented.
    expect(src).toMatch(/var sec = usingLive \? live\.sec : cachedSec/);
    // A live failure is recorded so the UI can explain, not retried forever.
    expect(src).toContain('_liveFailed[liveKey]');
    // And the reader can force a re-check.
    expect(src).toContain('Check again');
  });

  it('live mode is disabled rather than guessed for non-eCFR documents', () => {
    expect(src).toMatch(/var canLive = !!\(smeta && smeta\.cfrPart\)/);
  });
});

describe('Law Navigator renders without a network', () => {
  beforeEach(() => resetStemLab());

  it('renders the loading state instead of throwing when the corpus is unreachable', () => {
    // renderTool() swallows render throws and blanks the tool (Rock Cycle
    // lesson), so a crash here would ship as a silently empty pane. In SSR
    // there is no fetch and effects never run: the tool must still produce
    // a real, honest frame.
    const cfg = loadTool(TOOL, 'lawNavigator');
    expect(typeof cfg.render).toBe('function');
    const html = renderTool('lawNavigator', {});
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(100);
    expect(html).toMatch(/Loading the official text/i);
    // Crucially: no regulation text and no invented fallback in this state.
    expect(html).not.toMatch(/shall\s+be\s+provided/i);
  });

  it('quest hooks read defensively from empty state', () => {
    const cfg = loadTool(TOOL, 'lawNavigator');
    for (const q of cfg.questHooks) {
      expect(() => q.check({}), q.id).not.toThrow();
      expect(() => q.check(undefined), q.id + ' undefined').not.toThrow();
      expect(() => q.progress({}), q.id + ' progress').not.toThrow();
    }
  });
});

describe('Law Navigator wiring', () => {
  it('is registered, tiled, plugin-flagged, aliased, and loaded in both ANTI copies', () => {
    expect(src).toContain("registerTool('lawNavigator'");
    const mod = read('stem_lab/stem_lab_module.js');
    expect(mod).toContain("id: 'lawNavigator'");
    expect(mod).toContain('lawNavigator: true');
    expect(mod).toMatch(/lawNavigator: '[^']*section 504/);
    for (const anti of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      expect(read(anti), anti).toContain('stem_lab/stem_tool_lawnavigator.js');
    }
    expect(read('build.js')).toContain('stem_lab/stem_tool_lawnavigator.js');
  });

  it('ships the corpus to the desktop mirror', () => {
    for (const d of manifest.documents) {
      expect(fs.existsSync(path.join(root, 'desktop/web-app/public/law_corpus/' + d.slug + '.json')), d.slug).toBe(true);
    }
    expect(read('desktop/web-app/public/stem_lab/stem_tool_lawnavigator.js')).toBe(src);
  });

  it('Parenting Lab points readers at the verbatim text', () => {
    const pl = read('stem_lab/stem_tool_parentinglab.js');
    expect(pl).toContain('Education Law Navigator');
    expect(pl).toContain('verbatim text');
  });
});
