const fs = require('node:fs');
const path = require('node:path');
const filename = path.join(__dirname, 'domain_02.json');
const moduleData = JSON.parse(fs.readFileSync(filename, 'utf8'));
const byId = new Map(moduleData.items.map((item) => [item.legacyId, item]));

const additions = {
  'memory-aid-4faf3886e7b3904b': [
    {
      title: 'Statistical Learning by 8-Month-Old Infants',
      organization: 'Science, American Association for the Advancement of Science',
      url: 'https://doi.org/10.1126/science.274.5294.1926',
      whyReputable: 'This peer-reviewed primary experiment directly demonstrates infant sensitivity to transitional probabilities, supporting the statistical-learning claim in the comparison.',
    },
    {
      title: 'Early Language Acquisition: Cracking the Speech Code',
      organization: 'Nature Reviews Neuroscience via PubMed',
      url: 'https://pubmed.ncbi.nlm.nih.gov/10949305/',
      whyReputable: 'This peer-reviewed review directly integrates speech learning, social input, neurodevelopment, and sensitive-period evidence across early language acquisition.',
    },
  ],
  'memory-aid-b3ba39b4891aa7b7': [
    {
      title: 'Human Intelligence: The Model Is the Message',
      organization: 'Science via PubMed',
      url: 'https://pubmed.ncbi.nlm.nih.gov/17739108/',
      whyReputable: 'This indexed primary article by Sternberg directly presents and evaluates the triarchic account spanning internal processes, external adaptation, and experience.',
    },
    {
      title: 'Frames of Mind: The Theory of Multiple Intelligences',
      organization: 'Basic Books, Hachette Book Group',
      url: 'https://www.hachettebookgroup.com/titles/howard-gardner/frames-of-mind/9781541608528/',
      whyReputable: 'This primary scholarly book by Gardner directly presents the multiple-intelligences framework rather than relying on a generic intelligence definition.',
    },
    {
      title: 'g and the Measurement of Multiple Intelligences',
      organization: 'Intelligence, Elsevier',
      url: 'https://doi.org/10.1016/j.intell.2006.04.001',
      whyReputable: 'This peer-reviewed empirical study directly evaluates the independence and general-factor loading of tests designed around Gardner-style intelligences.',
    },
  ],
  'memory-aid-5081c24a4375de71': [
    {
      title: 'Human Cognitive Abilities: A Survey of Factor-Analytic Studies',
      organization: 'Cambridge University Press',
      url: 'https://doi.org/10.1017/CBO9780511571312',
      whyReputable: "Carroll's foundational scholarly synthesis directly supports hierarchical general, broad, and narrow cognitive-ability distinctions used in contemporary models.",
    },
    {
      title: 'CHC Theory and the Human Cognitive Abilities Project',
      organization: 'Intelligence, Elsevier',
      url: 'https://doi.org/10.1016/j.intell.2008.08.004',
      whyReputable: 'This peer-reviewed article directly presents the Cattell-Horn-Carroll synthesis and Human Cognitive Abilities Project rather than using a generic dictionary definition.',
    },
    {
      title: 'Human Intelligence: The Model Is the Message',
      organization: 'Science via PubMed',
      url: 'https://pubmed.ncbi.nlm.nih.gov/17739108/',
      whyReputable: 'This indexed primary article directly supports the triarchic-theory component while allowing it to be distinguished from psychometric CHC claims.',
    },
  ],
};

for (const [id, sources] of Object.entries(additions)) {
  const item = byId.get(id);
  if (!item) throw new Error(`Missing Domain 2 comparison item ${id}`);
  item.sourceDetails = sources;
  item.references = sources.map((source) => source.url);
  item.reviewNote = `${item.reviewNote} Multiple direct sources were added because the aid compares distinct theoretical and empirical frameworks.`;
}
fs.writeFileSync(filename, `${JSON.stringify(moduleData, null, 2)}\n`, 'utf8');
console.log('Refined broad-comparison provenance for 3 Domain 2 records');
