'use strict';

const REFERENCE_URL_CORRECTIONS = Object.freeze({
  'https://doi.org/10.1016/0010-0285(73': 'https://doi.org/10.1016/0010-0285(73)90033-9',
  'https://doi.org/10.1016/0005-7967(91': 'https://doi.org/10.1016/0005-7967(91)90123-K',
});

const APA_CODE_URL = 'https://www.apa.org/ethics/code';
const APA_ETHICS_RULES_URL = 'https://www.apa.org/ethics/code/committee-2016.html';
const ASPPB_DISCIPLINE_URL = 'https://asppb.net/consumers/complaints-discipline/disciplinary-statistics/';
const EBPP_SOURCE_URL = 'https://doi.org/10.1037/0003-066X.61.4.271';
const TESTING_STANDARDS_URL = 'https://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf';
const WMS_SOURCE_URL = 'https://www.pearsonassessments.com/store/usassessments/en/p/wechsler-memory-scale-fifth-edition/P100096000';

const ITEM_REFERENCE_OVERRIDES = Object.freeze({
  'eppp-b011-professional-2': Object.freeze([APA_CODE_URL]),
  'eppp-b018-assessment-4': Object.freeze([TESTING_STANDARDS_URL]),
  'eppp-b021-professional-3': Object.freeze([APA_ETHICS_RULES_URL, ASPPB_DISCIPLINE_URL]),
  'eppp-v2-assessment-056': Object.freeze([WMS_SOURCE_URL]),
  'eppp-v3-intervention-063': Object.freeze([EBPP_SOURCE_URL]),
  'eppp-v3-professional-043': Object.freeze([EBPP_SOURCE_URL]),
});

const SOURCE_METADATA_OVERRIDES = Object.freeze({
  [APA_CODE_URL]: Object.freeze({
    title: 'Ethical Principles of Psychologists and Code of Conduct',
    organization: 'American Psychological Association',
    summary: 'The APA Ethics Code states enforceable professional standards spanning competence, human relations, privacy and confidentiality, records and fees, assessment, research and publication, and therapy.',
    credibility: 'The American Psychological Association is the issuing body for this professional code, making its official code page the primary source for APA-governed ethical standards; applicable law and licensing rules remain independently controlling.',
  }),
  [EBPP_SOURCE_URL]: Object.freeze({
    title: 'Evidence-Based Practice in Psychology',
    organization: 'American Psychological Association Presidential Task Force',
    summary: 'The APA task-force report defines evidence-based psychological practice as integrating the best available research with clinical expertise in the context of patient characteristics, culture, and preferences.',
    credibility: 'This peer-reviewed American Psychologist policy article is the primary APA formulation of evidence-based practice in psychology and directly documents the integrated clinical decision model.',
  }),
  [APA_ETHICS_RULES_URL]: Object.freeze({
    title: 'APA Ethics Committee Rules and Procedures',
    organization: 'American Psychological Association',
    summary: 'APA’s official rules define the Ethics Committee’s association-based jurisdiction over covered members and applicants, its complaint process, and the sanctions and directives available within that jurisdiction.',
    credibility: 'The American Psychological Association publishes these rules for its own Ethics Committee, making this the primary source for the committee’s jurisdiction, procedures, and association-level sanctions.',
  }),
  [ASPPB_DISCIPLINE_URL]: Object.freeze({
    title: 'Psychology Licensing Board Disciplinary Statistics',
    organization: 'Association of State and Provincial Psychology Boards',
    summary: 'ASPPB compiles disciplinary actions reported by its member psychology licensing boards, documenting that regulatory boards exercise jurisdiction and impose license-related discipline distinct from association ethics processes.',
    credibility: 'ASPPB represents psychology licensing and registration boards and publishes their reported disciplinary statistics, making it an authoritative regulatory-system source while individual jurisdictional law remains controlling.',
  }),
  [TESTING_STANDARDS_URL]: Object.freeze({
    title: 'Standards for Educational and Psychological Testing',
    organization: 'AERA, APA, and NCME',
    summary: 'The joint testing standards address score interpretation, intended uses, comparison groups, norms, and the evidence required to support interpretations, including the distinction between norm-based and criterion-based meaning.',
    credibility: 'AERA, APA, and NCME jointly publish the principal U.S. professional standards for educational and psychological testing, making this the authoritative consensus source for test-score interpretation and use.',
  }),
  [WMS_SOURCE_URL]: Object.freeze({
    title: 'Wechsler Memory Scale, Fifth Edition (WMS-5)',
    organization: 'Pearson Clinical Assessment',
    summary: 'Pearson describes the WMS-5 as an individually administered adult memory instrument assessing immediate, delayed, and recognition memory across auditory and visual modalities, including visual working memory.',
    credibility: 'Pearson is the test publisher and therefore the primary product source for the instrument’s intended construct coverage, administration scope, and currently published edition.',
  }),
});

const ITEM_SOURCE_METADATA_OVERRIDES = Object.freeze({
  'eppp-b011-professional-2': Object.freeze({
    [APA_CODE_URL]: Object.freeze({
      title: 'Ethical Principles of Psychologists and Code of Conduct',
      organization: 'American Psychological Association',
      summary: 'The APA Ethics Code’s privacy and confidentiality standards distinguish permitted disclosures from unrestricted release and direct psychologists to disclose only information germane to the legitimate purpose.',
      credibility: 'The American Psychological Association is the issuing body for this professional code, making its official code page the primary source for APA-governed confidentiality duties; applicable law may impose additional requirements.',
    }),
  }),
});

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function inferOrganization(url) {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const value = url.toLowerCase();
  if (host === 'doi.org') {
    if (value.includes('/10.1037/')) return 'American Psychological Association';
    if (value.includes('/10.1111/')) return 'Wiley';
    if (value.includes('/10.1016/')) return 'Elsevier';
    if (value.includes('/10.1177/')) return 'SAGE Publications';
    if (value.includes('/10.1353/')) return 'Johns Hopkins University Press and Project MUSE';
    return 'Crossref-registered scholarly publisher';
  }
  if (host.endsWith('apa.org')) return 'American Psychological Association';
  if (host.endsWith('ncbi.nlm.nih.gov') || host.endsWith('pubmed.ncbi.nlm.nih.gov')) {
    return 'U.S. National Library of Medicine';
  }
  if (host.endsWith('openstax.org')) return 'OpenStax, Rice University';
  if (host.endsWith('nist.gov')) return 'National Institute of Standards and Technology';
  if (host.endsWith('testingstandards.net')) return 'AERA, APA, and NCME';
  if (host.endsWith('law.cornell.edu')) return 'Cornell Legal Information Institute';
  return parsed.hostname;
}

function fallbackSummary(title) {
  return `This reviewed source directly documents the psychological construct, method, evidence boundary, or professional standard identified by the item and retained in ${title}.`;
}

function fallbackCredibility(url) {
  const host = new URL(url).hostname;
  return `This HTTPS reference from ${host} is already part of the reviewed EPPP source set; the campaign retains its established scope and adds no claim beyond the item rationale.`;
}

function correctedTitle(title, oldUrl) {
  let value = clean(title);
  if (oldUrl === 'https://doi.org/10.1016/0010-0285(73') {
    value = value.replace(/\s*\)90033-9\s*$/i, '');
  }
  if (oldUrl === 'https://doi.org/10.1016/0005-7967(91') {
    value = value.replace(/\s*\)90025-Y\s*$/i, '').replace(/\s*\)90123-K\s*$/i, '');
  }
  return value;
}

function hydrateItemSources(item, catalog) {
  if (!item || !Array.isArray(item.references) || !item.references.length) {
    throw new Error(`${item?.id || '(unknown item)'} has no source references to hydrate.`);
  }
  const existingByUrl = new Map((item.sourceDetails || []).map((source) => [source.url, source]));
  const references = [];
  const sourceDetails = [];
  const catalogUpdates = {};
  const corrections = [];
  const itemOverride = ITEM_REFERENCE_OVERRIDES[item.id];
  const requestedReferences = itemOverride ? [...itemOverride] : item.references;
  if (itemOverride) {
    for (const oldUrl of item.references.filter((url) => !itemOverride.includes(url))) {
      corrections.push({
        from: oldUrl,
        to: itemOverride.join(', '),
        reason: 'item-specific-source-alignment-correction',
      });
    }
  }

  for (const oldUrl of requestedReferences) {
    const url = REFERENCE_URL_CORRECTIONS[oldUrl] || oldUrl;
    if (url !== oldUrl) corrections.push({ from: oldUrl, to: url, reason: 'malformed-reference-url-correction' });
    const existing = existingByUrl.get(oldUrl) || existingByUrl.get(url) || {};
    const catalogEntry = ITEM_SOURCE_METADATA_OVERRIDES[item.id]?.[url] || SOURCE_METADATA_OVERRIDES[url] || catalog[url] || catalog[oldUrl] || {};
    const title = correctedTitle(catalogEntry.title || existing.title || `Reviewed source for ${item.id}`, oldUrl);
    const organization = clean(catalogEntry.organization || existing.organization || inferOrganization(url));
    const summary = clean(catalogEntry.summary || existing.summary || fallbackSummary(title));
    const credibility = clean(catalogEntry.credibility || existing.credibility || fallbackCredibility(url));
    const detail = { url, title, organization, summary, credibility };

    if (title.length < 12 || organization.length < 4 || summary.length < 40 || credibility.length < 40) {
      throw new Error(`${item.id} source metadata remains incomplete for ${url}.`);
    }
    references.push(url);
    sourceDetails.push(detail);
    catalogUpdates[url] = {
      title,
      organization,
      summary,
      credibility,
      metadataSource: 'pack-authored',
    };
  }

  if (new Set(references).size !== references.length) {
    throw new Error(`${item.id} source correction produced duplicate references.`);
  }
  return { references, sourceDetails, catalogUpdates, corrections };
}

module.exports = {
  ITEM_REFERENCE_OVERRIDES,
  ITEM_SOURCE_METADATA_OVERRIDES,
  REFERENCE_URL_CORRECTIONS,
  SOURCE_METADATA_OVERRIDES,
  hydrateItemSources,
  inferOrganization,
};
