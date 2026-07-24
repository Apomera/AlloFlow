#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const output = path.join(sourceDir, 'reference_catalog.json');
const deployOutput = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reference_catalog.json');
const decodeEntityCodePoint = (value, radix) => { const code = Number.parseInt(value, radix); return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''; };
const namedHtmlEntities = Object.freeze({ nbsp: ' ', amp: '&', quot: '"', apos: "'", lsquo: "'", rsquo: "'", ldquo: '"', rdquo: '"', ndash: '–', mdash: '—', hellip: '…', lt: '<', gt: '>', copy: '©', reg: '®' });
const cleanText = (value) => String(value || '').replace(/<[^>]+>/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_match, code) => decodeEntityCodePoint(code, 16)).replace(/&#(\d+);/g, (_match, code) => decodeEntityCodePoint(code, 10)).replace(/&([a-z]+);/gi, (match, name) => Object.prototype.hasOwnProperty.call(namedHtmlEntities, name.toLowerCase()) ? namedHtmlEntities[name.toLowerCase()] : match).replace(/\s+/g, ' ').trim();
const shorten = (value, limit = 420) => {
  const text = cleanText(value);
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit + 1);
  const sentence = clipped.lastIndexOf('. ');
  const space = clipped.lastIndexOf(' ');
  return clipped.slice(0, sentence > limit * 0.55 ? sentence + 1 : space).trim() + '…';
};


function collectReferences(value, references, catalog, protectedMetadataUrls = new Set()) {
  if (typeof value === 'string') {
    if (/^https:\/\/\S+$/i.test(value.trim())) references.add(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectReferences(entry, references, catalog, protectedMetadataUrls);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (/^https:\/\//i.test(String(value.url || '')) && value.title && !protectedMetadataUrls.has(value.url)) {
    catalog[value.url] = {
      title: cleanText(value.title),
      organization: cleanText(value.organization || ''),
      summary: shorten(value.summary || value.relevance || value.credibility || value.whyReputable || ''),
      credibility: shorten(value.credibility || value.whyReputable || ''),
      metadataSource: 'pack-authored',
    };
  }
  for (const entry of Object.values(value)) collectReferences(entry, references, catalog, protectedMetadataUrls);
}

const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith('_items.json'));
const references = new Set();
const catalog = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : {};
const itemBankAuthoredMetadataUrls = new Set();
for (const file of files) {
  const items = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
  for (const item of Array.isArray(items) ? items : []) {
    for (const reference of item.references || []) references.add(reference);
    for (const source of item.sourceDetails || []) {
      if (!source || !source.url || !source.title) continue;
      itemBankAuthoredMetadataUrls.add(source.url);
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
  collectReferences(pack, references, catalog, itemBankAuthoredMetadataUrls);
  const packReferences = new Set((pack.items || []).flatMap((item) => item.references || []));
  for (const reference of packReferences) {
    if (!/praxis\.ets\.org|ets\.org/i.test(reference)) continue;
    if (itemBankAuthoredMetadataUrls.has(reference)) continue;
    if (/\.pdf(?:$|\?)/i.test(reference)) catalog[reference] = { title: `${pack.shortTitle} — Official ETS Study Companion`, organization: 'Educational Testing Service (ETS)', summary: `The official study companion describes the ${pack.shortTitle} format, blueprint, tested content, and sample question guidance.`, credibility: 'ETS develops and administers Praxis assessments; this primary source is authoritative for the published exam structure, while AlloFlow practice remains independently authored.', metadataSource: 'pack-derived' };
    else if (/\/test\//i.test(reference)) catalog[reference] = { title: `${pack.shortTitle} — Official ETS Test Page`, organization: 'Educational Testing Service (ETS)', summary: `The official test page provides the current public overview and delivery details for ${pack.shortTitle}.`, credibility: 'ETS is the assessment owner, so this is the primary public source for current test logistics and official preparation links.', metadataSource: 'pack-derived' };
  }
}


for (const file of fs.readdirSync(sourceDir).filter((name) => name.endsWith('_learning_library.json'))) {
  collectReferences(JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8')), references, catalog, itemBankAuthoredMetadataUrls);
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
Object.assign(catalog, {
  'https://www.naeyc.org/resources/position-statements/dap/principles': {
    title: 'Principles of Child Development and Learning and Implications That Inform Practice', organization: 'National Association for the Education of Young Children (NAEYC)',
    summary: 'This companion to NAEYC’s developmentally appropriate practice position statement explains core principles about development, individual and cultural variation, relationships, play, motivation, challenge, and the interaction of biology and experience.',
    credibility: 'NAEYC is the professional association that publishes this position statement. It is an authoritative primary source for NAEYC’s framework, while users should distinguish professional guidance from a test blueprint or a single empirical study.', metadataSource: 'explicit-override',
  },
  'https://www.socialstudies.org/standards/national-curriculum-standards-social-studies': {
    title: 'National Curriculum Standards for Social Studies: A Framework for Teaching, Learning, and Assessment', organization: 'National Council for the Social Studies (NCSS)',
    summary: 'NCSS presents its ten thematic strands and a curriculum framework for planning social-studies instruction, learning experiences, and assessment across the school years.',
    credibility: 'NCSS is the discipline’s national professional organization and publisher of these curriculum standards. The standards are a primary professional framework, not an ETS blueprint or evidence rating for a particular intervention.', metadataSource: 'explicit-override',
  },
  'https://www.npbea.org/wp-content/uploads/2017/06/Professional-Standards-for-Educational-Leaders_2015.pdf': {
    title: 'Professional Standards for Educational Leaders 2015', organization: 'National Policy Board for Educational Administration (NPBEA)',
    summary: 'PSEL 2015 defines ten interdependent standards for educational leadership, including mission and vision, ethics, equity, curriculum and instruction, community, professional capacity, operations, and continuous improvement.',
    credibility: 'NPBEA is the publisher of PSEL 2015, making this the primary source for the standards’ wording and organization. State requirements and credential blueprints may adopt or adapt the framework differently.', metadataSource: 'explicit-override',
  },
  'https://www.tesol.org/media/v33fewo0/2018-tesol-teacher-prep-standards-final.pdf': {
    title: 'The 2018 TESOL International Association Standards for Initial TESOL Pre-K–12 Teacher Preparation Programs', organization: 'TESOL International Association',
    summary: 'These teacher-preparation standards address knowledge about language and multilingual learners, planning and implementing instruction, assessment, and professional practice for initial P–12 TESOL educators.',
    credibility: 'TESOL International Association developed and publishes these professional preparation standards. They are a primary source for the association’s expectations, but not a substitute for current state rules or the ETS 5362 blueprint.', metadataSource: 'explicit-override',
  },
  'https://ccsso.org/sites/default/files/2017-11/InTASC_Model_Core_Teaching_Standards_2011.pdf': {
    title: 'InTASC Model Core Teaching Standards: A Resource for State Dialogue', organization: 'Council of Chief State School Officers (CCSSO)',
    summary: 'The InTASC document describes ten model teaching standards organized around the learner, content, instructional practice, and professional responsibility, with performance, knowledge, and disposition indicators.',
    credibility: 'CCSSO developed and publishes the InTASC model standards as a primary professional framework. Jurisdictions may adapt them, and they do not replace a current licensure test specification.', metadataSource: 'explicit-override',
  },
  'https://www.thecorestandards.org/ELA-Literacy/': {
    title: 'Common Core State Standards for English Language Arts and Literacy', organization: 'Common Core State Standards Initiative',
    summary: 'This standards page organizes K–12 expectations for reading, writing, speaking and listening, language, and literacy in history, social studies, science, and technical subjects.',
    credibility: 'The Common Core State Standards Initiative page is a primary source for the published standards. Adoption and implementation vary by jurisdiction, and the standards are not an assessment blueprint.', metadataSource: 'explicit-override',
  },
  'https://www.thecorestandards.org/Math/': {
    title: 'Common Core State Standards for Mathematics', organization: 'Common Core State Standards Initiative',
    summary: 'This source presents the Standards for Mathematical Practice and grade-level or high-school content standards covering number, operations, algebra, functions, geometry, measurement, data, statistics, and probability.',
    credibility: 'The Common Core State Standards Initiative page is a primary source for the published mathematics standards. Jurisdictions may adopt, revise, or replace them, and they are not an ETS test specification.', metadataSource: 'explicit-override',
  },
  'https://www.literacyworldwide.org/docs/default-source/resource-documents/standards-appendix-A.pdf': {
    title: 'Standards for the Preparation of Literacy Professionals 2017 — Appendix A', organization: 'International Literacy Association (ILA)',
    summary: 'This appendix accompanies ILA’s 2017 preparation standards and supplies role-specific standard components for literacy professionals, including foundational knowledge, curriculum and instruction, assessment, diversity and equity, learners and the literacy environment, and professional learning.',
    credibility: 'ILA developed and publishes its literacy-professional preparation standards, making the appendix a primary source for that framework. It is professional guidance rather than an official Praxis specification or psychometric validity study.', metadataSource: 'explicit-override',
  },
  'https://dyslexiaida.org/knowledge-and-practices/': {
    title: 'Knowledge and Practice Standards for Teachers of Reading', organization: 'International Dyslexia Association (IDA)',
    summary: 'IDA’s standards describe knowledge and teaching practices for structured literacy, including language structure, reading development, assessment, word recognition, fluency, vocabulary, comprehension, and written expression.',
    credibility: 'IDA is the publisher of these professional knowledge and practice standards. They are a primary source for the IDA framework but do not independently establish a learner’s diagnosis, eligibility, or the content of an ETS exam.', metadataSource: 'explicit-override',
  },
  'https://ies.ed.gov/ncee/wwc/Docs/PracticeGuide/wwc_foundationalreading_070516.pdf': {
    title: 'Foundational Skills to Support Reading for Understanding in Kindergarten Through 3rd Grade', organization: 'What Works Clearinghouse (WWC), Institute of Education Sciences (IES), U.S. Department of Education',
    summary: 'This K–3 practice guide presents implementation recommendations for academic language, sound awareness and letter links, decoding and word analysis, and daily reading of connected text, with evidence ratings and implementation guidance.',
    credibility: 'WWC and IES developed the guide through an expert panel and systematic evidence review. Recommendation-specific evidence ratings and stated limitations should remain attached when educators apply the guidance.', metadataSource: 'explicit-override',
  },
  'https://intensiveintervention.org/tools-charts/overview': {
    title: 'Tools Chart Overview', organization: 'National Center on Intensive Intervention',
    summary: 'NCII explains its six academic and behavioral screening, progress-monitoring, and intervention tools charts, the technical-review criteria behind them, and steps for selecting tools that fit local needs.',
    credibility: 'NCII’s external technical review committees rate voluntarily submitted tools against published criteria; the charts do not rank products and inclusion is not an endorsement. This is the primary NCII explanation of appropriate chart use.', metadataSource: 'explicit-override',
  },
  'https://intensiveintervention.org/data-based-individualization/progress-monitoring': {
    title: 'Progress Monitoring Within Data-Based Individualization', organization: 'National Center on Intensive Intervention',
    summary: 'This NCII resource explains how frequent progress data, graphed performance, goals, and decision rules support evaluation and adaptation of intensive intervention within a data-based individualization process.',
    credibility: 'NCII is a federally supported technical-assistance center specializing in intensive intervention. Its guidance is authoritative for the NCII DBI model, while local teams must select technically adequate measures and follow current requirements.', metadataSource: 'explicit-override',
  },
  'https://www.copyright.gov/circs/circ21.pdf': {
    title: 'Circular 21: Reproduction of Copyrighted Works by Educators and Librarians', organization: 'U.S. Copyright Office',
    summary: 'Copyright Office Circular 21 compiles statutory provisions, legislative discussion, and guidelines concerning educational copying, music, interlibrary arrangements, and library or archives reproduction.',
    credibility: 'The U.S. Copyright Office is the federal primary source for this circular. The document is informational, some included guidelines are historical, and it is not individualized legal advice or a substitute for current law.', metadataSource: 'explicit-override',
  },
  'https://www.nasponline.org/x55315.xml': {
    title: 'The Professional Standards of the National Association of School Psychologists', organization: 'National Association of School Psychologists (NASP)',
    summary: 'The 2020 NASP professional standards include the model for comprehensive and integrated school psychological services, preparation and credentialing standards, and principles for professional ethics.',
    credibility: 'NASP developed and publishes these professional standards, making this a primary source for the association’s model and ethical expectations. State credential rules and the ETS 5403 blueprint remain separate authorities.', metadataSource: 'explicit-override',
  },
});

const organizationByHost = {
  'www.aaidd.org': 'American Association on Intellectual and Developmental Disabilities (AAIDD)',
  'www.ala.org': 'American Library Association (ALA)',
  'standards.aasl.org': 'American Association of School Librarians (AASL)',
  'www.asha.org': 'American Speech-Language-Hearing Association (ASHA)',
  'schoolcounselor.org': 'American School Counselor Association (ASCA)',
  'www.schoolcounselor.org': 'American School Counselor Association (ASCA)',
  'ccsso.org': 'Council of Chief State School Officers (CCSSO)',
  'www.cdc.gov': 'Centers for Disease Control and Prevention (CDC)',
  'www.cisa.gov': 'Cybersecurity and Infrastructure Security Agency (CISA)',
  'www.copyright.gov': 'U.S. Copyright Office',
  'dyslexiaida.org': 'International Dyslexia Association (IDA)',
  'exceptionalchildren.org': 'Council for Exceptional Children (CEC)',
  'ies.ed.gov': 'Institute of Education Sciences (IES), U.S. Department of Education',
  'intensiveintervention.org': 'National Center on Intensive Intervention',
  'www.literacyworldwide.org': 'International Literacy Association (ILA)',
  'ncela.ed.gov': 'National Clearinghouse for English Language Acquisition (NCELA), U.S. Department of Education',
  'www.naeyc.org': 'National Association for the Education of Young Children (NAEYC)',
  'www.nasponline.org': 'National Association of School Psychologists (NASP)',
  'pubmed.ncbi.nlm.nih.gov': 'PubMed, U.S. National Library of Medicine',
  'www.nationalartsstandards.org': 'National Coalition for Core Arts Standards',
  'www.nextgenscience.org': 'Next Generation Science Standards',
  'www.npbea.org': 'National Policy Board for Educational Administration (NPBEA)',
  'openstax.org': 'OpenStax, Rice University',
  'www.osha.gov': 'Occupational Safety and Health Administration (OSHA)',
  'www.shapeamerica.org': 'SHAPE America',
  'sites.ed.gov': 'Office of Special Education Programs, U.S. Department of Education',
  'www.socialstudies.org': 'National Council for the Social Studies (NCSS)',
  'studentprivacy.ed.gov': 'Student Privacy Policy Office, U.S. Department of Education',
  'www.tesol.org': 'TESOL International Association',
  'www.thecorestandards.org': 'Common Core State Standards Initiative',
  'www.ed.gov': 'U.S. Department of Education',
  'www.hhs.gov': 'U.S. Department of Health and Human Services',
  'wida.wisc.edu': 'WIDA, Wisconsin Center for Education Research',
};

function organizationFor(reference) {
  try {
    const hostname = new URL(reference).hostname.toLowerCase();
    return organizationByHost[hostname] || hostname.replace(/^www\./, '');
  } catch {
    return 'Source publisher';
  }
}

function titleFromReference(reference) {
  try {
    const url = new URL(reference);
    const parts = url.pathname.split('/').filter(Boolean);
    let value = decodeURIComponent(parts[parts.length - 1] || url.hostname);
    if (/^\d+(?:\.\d+)+$/.test(value) && parts.includes('regs')) {
      value = 'IDEA regulation section ' + value;
    } else {
      value = value.replace(/\.(?:pdf|html?|aspx?)$/i, '').replace(/[-_]+/g, ' ');
    }
    value = value.replace(/\s+/g, ' ').trim();
    if (value.length < 12) value = organizationFor(reference) + ' resource';
    return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  } catch {
    return 'Referenced educational source';
  }
}

function credibilityFor(reference, organization) {
  let hostname = '';
  try { hostname = new URL(reference).hostname.toLowerCase(); } catch {}
  if (hostname === 'pubmed.ncbi.nlm.nih.gov') {
    return 'PubMed is maintained by the National Center for Biotechnology Information at the U.S. National Library of Medicine. Its indexed citation and abstract support traceability to the scholarly publication; inclusion in PubMed is not by itself a guarantee of study quality.';
  }
  if (/\.gov$|\.gov\./.test(hostname) || hostname.endsWith('.ed.gov')) {
    return organization + ' is the responsible government publisher, making this a primary source for its own regulations, guidance, data, or program materials. Verify the publication date, jurisdiction, and any later updates before applying it.';
  }
  if (/openstax\.org$/.test(hostname)) {
    return 'OpenStax is a nonprofit educational initiative at Rice University whose openly licensed textbooks use expert authorship, faculty review, and a documented errata process. Textbook guidance should still be distinguished from an official assessment blueprint or primary empirical evidence.';
  }
  return organization + ' is the primary publisher of this professional standard, framework, position, or practice resource. It is authoritative for the organization’s own guidance, but users should distinguish professional guidance from law, official test specifications, and independent empirical evidence.';
}

function fallbackWebMetadata(reference) {
  const organization = organizationFor(reference);
  const title = titleFromReference(reference);
  return {
    title,
    organization,
    summary: 'This ' + organization + ' resource addresses ' + title + '. Open the source to review its complete scope, definitions, recommendations, examples, publication date, and stated limitations.',
    credibility: credibilityFor(reference, organization),
    metadataSource: 'url-derived-reviewed-fallback',
  };
}

function htmlMetadata(html, name) {
  const patterns = name === 'title'
    ? [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i,
        /<title[^>]*>([\s\S]*?)<\/title>/i,
      ]
    : [
        /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i,
      ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && cleanText(match[1])) return cleanText(match[1]);
  }
  return '';
}

async function resolveWeb(reference) {
  const fallback = fallbackWebMetadata(reference);
  let response;
  try {
    response = await fetch(reference, {
      headers: { 'User-Agent': 'AlloFlow-Test-Prep-Metadata/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return fallback;
  }
  if (!response.ok || !/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') || '')) return fallback;
  let html;
  try { html = await response.text(); } catch { return fallback; }
  const pageTitle = htmlMetadata(html, 'title');
  const pageSummary = htmlMetadata(html, 'description');
  const usableTitle = pageTitle && pageTitle.length >= 12 && !/\b(?:404|not found|access denied|just a moment)\b/i.test(pageTitle)
    ? shorten(pageTitle, 180)
    : fallback.title;
  return {
    ...fallback,
    title: usableTitle,
    summary: pageSummary && pageSummary.length >= 40
      ? shorten(pageSummary)
      : fallback.summary,
    metadataSource: pageTitle || pageSummary ? 'page-metadata' : fallback.metadataSource,
  };
}
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
  const unresolvedWeb = [...references].filter((reference) =>
    /^https:\/\//i.test(reference)
    && !/^https:\/\/doi\.org\//i.test(reference)
    && (!catalog[reference]?.title || !catalog[reference]?.organization || !catalog[reference]?.summary || !catalog[reference]?.credibility || catalog[reference]?.metadataSource === 'url-derived-reviewed-fallback')
  );
  let webCursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (webCursor < unresolvedWeb.length) {
      const reference = unresolvedWeb[webCursor++];
      catalog[reference] = await resolveWeb(reference);
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
  for (const [reference, detail] of Object.entries(catalog)) {
    if (new URL(reference).hostname.toLowerCase() === 'pubmed.ncbi.nlm.nih.gov') {
      detail.organization = organizationFor(reference);
      detail.credibility = credibilityFor(reference, detail.organization);
    }
    detail.title = cleanText(detail.title);
    detail.organization = cleanText(detail.organization);
    detail.summary = shorten(detail.summary);
    detail.credibility = shorten(detail.credibility);
  }
  const ordered = Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b)));
  fs.mkdirSync(path.dirname(deployOutput), { recursive: true });
  const json = JSON.stringify(ordered, null, 2) + '\n';
  fs.writeFileSync(output, json, 'utf8');
  fs.writeFileSync(deployOutput, json, 'utf8');
  const resolved = doiReferences.filter((reference) => ordered[reference]?.metadataSource === 'Crossref').length;
  console.log(`Reference catalog: ${Object.keys(ordered).length} records; ${resolved}/${doiReferences.length} DOI titles resolved through Crossref.`);
}
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = { collectReferences };
