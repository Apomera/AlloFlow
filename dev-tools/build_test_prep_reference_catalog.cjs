#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const output = path.join(sourceDir, 'reference_catalog.json');
const deployOutput = path.join(root, 'prismflow-deploy', 'public', 'test_prep', 'reference_catalog.json');
const cleanText = (value) => String(value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim();
const shorten = (value, limit = 420) => {
  const text = cleanText(value);
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit + 1);
  const sentence = clipped.lastIndexOf('. ');
  const space = clipped.lastIndexOf(' ');
  return clipped.slice(0, sentence > limit * 0.55 ? sentence + 1 : space).trim() + '…';
};

const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith('_items.json'));
const references = new Set();
const catalog = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : {};
for (const file of files) {
  const items = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
  for (const item of Array.isArray(items) ? items : []) {
    for (const reference of item.references || []) references.add(reference);
    for (const source of item.sourceDetails || []) {
      if (!source || !source.url || !source.title) continue;
      catalog[source.url] = {
        title: cleanText(source.title),
        organization: cleanText(source.organization || ''),
        summary: shorten(source.summary || source.relevance || source.credibility || source.whyReputable || ''),
        credibility: shorten(source.credibility || source.whyReputable || ''),
        metadataSource: 'pack-authored',
      };
    }
  }
}

for (const file of fs.readdirSync(sourceDir).filter((name) => name.endsWith('_pack.json'))) {
  const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
  const packReferences = new Set((pack.items || []).flatMap((item) => item.references || []));
  for (const reference of packReferences) {
    if (!/praxis\.ets\.org|ets\.org/i.test(reference)) continue;
    if (/\.pdf(?:$|\?)/i.test(reference)) catalog[reference] = { title: `${pack.shortTitle} — Official ETS Study Companion`, organization: 'Educational Testing Service (ETS)', summary: `The official study companion describes the ${pack.shortTitle} format, blueprint, tested content, and sample question guidance.`, credibility: 'ETS develops and administers Praxis assessments; this primary source is authoritative for the published exam structure, while AlloFlow practice remains independently authored.', metadataSource: 'pack-derived' };
    else if (/\/test\//i.test(reference)) catalog[reference] = { title: `${pack.shortTitle} — Official ETS Test Page`, organization: 'Educational Testing Service (ETS)', summary: `The official test page provides the current public overview and delivery details for ${pack.shortTitle}.`, credibility: 'ETS is the assessment owner, so this is the primary public source for current test logistics and official preparation links.', metadataSource: 'pack-derived' };
  }
}


const explicitMetadataOverrides = {
  'https://www.ets.org/pdfs/parapro/1755.pdf': {
    title: 'ParaPro Assessment (1755) - Official Study Companion',
    organization: 'Educational Testing Service (ETS)',
    summary: 'The official study companion describes the current ParaPro structure, its reading, mathematics, and writing blueprint, the balance between basic skills and classroom application, tested content topics, sample questions, answer explanations, and test-taking guidance.',
    credibility: 'ETS owns and administers the ParaPro Assessment, making this the primary source for its published blueprint and official samples. AlloFlow practice items are independently authored; they are not ETS questions and are not endorsed by ETS.',
    metadataSource: 'explicit-override',
  },
  'https://ies.ed.gov/ncee/wwc/PracticeGuide/21/Published': {
    title: 'Foundational Skills to Support Reading for Understanding in Kindergarten Through 3rd Grade',
    organization: 'What Works Clearinghouse (WWC), Institute of Education Sciences (IES), U.S. Department of Education',
    summary: 'This K-3 practice guide presents four implementation-focused recommendations covering academic language and vocabulary, speech-sound awareness and letter links, decoding and word analysis, and daily connected-text reading. It reports an evidence rating for each recommendation and discusses common implementation obstacles.',
    credibility: 'The WWC is an IES evidence-review program of the U.S. Department of Education. The guide was developed through an expert panel and systematic review, and it states the supporting-evidence level for each recommendation; users should retain those recommendation-specific ratings when applying the guidance.',
    metadataSource: 'explicit-override',
  },
  'https://openstax.org/details/books/prealgebra-2e/': {
    title: 'Prealgebra 2e',
    organization: 'OpenStax, Rice University',
    summary: 'This openly licensed textbook develops foundational mathematics through whole numbers, fractions, decimals, percents, elementary algebra, equations, geometry, measurement, graphs, and applied problem solving.',
    credibility: 'OpenStax is a nonprofit educational initiative at Rice University. Its textbooks use expert authorship, faculty review, and a documented errata process, making this a credible instructional reference rather than an assessment blueprint.',
    metadataSource: 'explicit-override',
  },
  'https://openstax.org/books/writing-guide/pages/handbook': {
    title: 'Handbook - Writing Guide with Handbook',
    organization: 'OpenStax, Rice University',
    summary: 'This writing handbook is a concise reference for paragraphs and transitions, sentence clarity and errors, word choice, point of view, verbs, pronouns, punctuation, mechanics, quotations, and MLA and APA documentation.',
    credibility: 'OpenStax is a nonprofit educational initiative at Rice University. This openly licensed, faculty-reviewed handbook provides transparent instructional guidance and examples, with corrections supported through OpenStax editorial and errata processes.',
    metadataSource: 'explicit-override',
  },
  'https://openstax.org/books/writing-guide/pages/16-5-writing-process-thinking-critically-about-text': {
    title: '16.5 Writing Process: Thinking Critically About Text',
    organization: 'OpenStax, Rice University',
    summary: 'This section guides writers through planning, drafting, reviewing, revising, rewriting, editing, and peer review for a text-focused analytical essay, including thesis development, objective summary, structural and contextual analysis, and integration of textual evidence.',
    credibility: 'OpenStax is a nonprofit educational initiative at Rice University. This openly licensed, faculty-reviewed section offers transparent writing-process instruction and examples, while its textbook status should be distinguished from empirical evidence or an official assessment specification.',
    metadataSource: 'explicit-override',
  },
  'https://data.census.gov/': {
    title: 'Explore Census Data',
    organization: 'U.S. Census Bureau, U.S. Department of Commerce',
    summary: 'The Census Bureau’s primary centralized data platform supports searches across demographic and economic tables, profiles, maps, and public-use microdata for many topics and geographic areas.',
    credibility: 'The U.S. Census Bureau is the federal government’s primary statistical agency for population and economic data. Users should verify the selected dataset, year, table, geography, estimates, and margins of error when applicable.',
    metadataSource: 'explicit-override',
  },
  'https://ies.ed.gov/ncee/wwc/PracticeGuide/14': {
    title: 'Improving Reading Comprehension in Kindergarten Through 3rd Grade',
    organization: 'What Works Clearinghouse (WWC), Institute of Education Sciences (IES), U.S. Department of Education',
    summary: 'This K-3 practice guide presents five evidence-rated recommendations addressing comprehension strategies, text structure, high-quality discussion, purposeful text selection, and an engaging context for reading comprehension instruction.',
    credibility: 'The WWC is an IES evidence-review program of the U.S. Department of Education. The guide was developed through an expert panel and systematic review, and users should retain its recommendation-specific evidence ratings when applying the guidance.',
    metadataSource: 'explicit-override',
  },
  'https://ies.ed.gov/ncee/wwc/PracticeGuide/29': {
    title: 'Providing Reading Interventions for Students in Grades 4–9',
    organization: 'What Works Clearinghouse (WWC), Institute of Education Sciences (IES), U.S. Department of Education',
    summary: 'This practice guide offers evidence-based intervention recommendations for students in grades 4–9 covering decoding, fluency-building, comprehension-building practices such as gist and questioning, and supported work with challenging stretch text.',
    credibility: 'The WWC and IES developed the guide through expert-panel analysis and a systematic evidence review. Its recommendation-specific evidence ratings should be considered when translating the guidance into instruction.',
    metadataSource: 'explicit-override',
  },
};
Object.assign(catalog, explicitMetadataOverrides);

const doiReferences = [...references].filter((reference) => /^https:\/\/doi\.org\/.+/i.test(reference));
const unresolved = doiReferences.filter((reference) => !catalog[reference]?.title || catalog[reference].metadataSource === 'fallback' || catalog[reference].title.startsWith('Digital Object Identifier'));
async function resolveDoi(reference) {
  const doi = reference.replace(/^https:\/\/doi\.org\//i, '');
  if (/\($/.test(doi) || !doi.includes('/')) return null;
  let response;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await fetch('https://api.crossref.org/works/' + encodeURIComponent(doi), { headers: { 'User-Agent': 'AlloFlow-Test-Prep-Metadata/1.0' } });
    if (response.ok || response.status === 404) break;
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }
  if (!response || !response.ok) return null;
  const record = (await response.json()).message || {};
  const title = cleanText(Array.isArray(record.title) ? record.title[0] : record.title);
  if (!title) return null;
  const organization = cleanText((Array.isArray(record['container-title']) && record['container-title'][0]) || record.publisher || '');
  const abstract = shorten(record.abstract || '', 420);
  return {
    title,
    organization,
    summary: abstract || `This scholarly work focuses on “${title}.” Open the source to review its methods, scope, findings, and limitations in context.`,
    credibility: 'The DOI provides a persistent link to the publisher metadata for this scholarly work. Evidentiary strength still depends on the publication type, methods, sample, analysis, and fit to the claim.',
    metadataSource: 'Crossref',
    doi,
  };
}

async function main() {
  let cursor = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (cursor < unresolved.length) {
      const reference = unresolved[cursor++];
      try {
        const detail = await resolveDoi(reference);
        if (detail) catalog[reference] = detail;
      } catch (_error) {}
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }));
  for (const reference of doiReferences) {
    if (catalog[reference]?.title) continue;
    const doi = reference.replace(/^https:\/\/doi\.org\//i, '');
    catalog[reference] = {
      title: `Scholarly source (DOI ${doi})`,
      organization: 'DOI Foundation record',
      summary: 'This DOI is retained for traceability, but complete publication metadata was not available during the catalog build. Open the record to verify the work’s title, scope, and publication details.',
      credibility: 'A DOI is a persistent identifier, not a quality rating. Verify the resolved publication and evaluate its methods before relying on the claim.',
      metadataSource: 'fallback',
      doi,
    };
  }
  const ordered = Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b)));
  fs.mkdirSync(path.dirname(deployOutput), { recursive: true });
  const json = JSON.stringify(ordered, null, 2) + '\n';
  fs.writeFileSync(output, json, 'utf8');
  fs.writeFileSync(deployOutput, json, 'utf8');
  const resolved = doiReferences.filter((reference) => ordered[reference]?.metadataSource === 'Crossref').length;
  console.log(`Reference catalog: ${Object.keys(ordered).length} records; ${resolved}/${doiReferences.length} DOI titles resolved through Crossref.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
