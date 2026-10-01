// Read-only inventory used for the September 27 Dinosaur Lab design review.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../../stem_lab/stem_tool_dinolab.js'), 'utf8');
const context = { window: { StemLab: { registerTool() {} } }, console };
vm.createContext(context);
vm.runInContext(source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.audit = { DINOS, QUIZ, SITES, ANATOMY, GLOSSARY }; window.StemLab.registerTool('dinoLab'"), context);
const { DINOS, QUIZ, SITES, ANATOMY, GLOSSARY } = context.audit;
const terms = ['feather', 'plumage', 'quill', 'filament', 'fuzz', 'wing'];
const wingOnlyMatches = DINOS.filter(d => d.group !== 'other').map(d => {
  const text = (d.blurb + ' ' + d.traits.join(' ')).toLowerCase();
  const matches = terms.filter(term => text.includes(term));
  return { id: d.id, name: d.common, group: d.group, matches, matchingWords: text.split(/\s+/).filter(w => w.includes('wing')) };
}).filter(d => d.matches.length === 1 && d.matches[0] === 'wing');
const variousFormation = DINOS.filter(d => d.group !== 'other' && d.formation === 'Various').map(d => ({name:d.common, period:d.period, region:d.region, older:d.myaHi, younger:d.myaLo}));
const output = {
  species: DINOS.length,
  trueDinosaurEntries: DINOS.filter(d => d.group !== 'other').length,
  quizQuestions: QUIZ.length,
  siteCards:SITES.length,
  fossilEvidenceCategories:ANATOMY.length,
  glossaryTerms:GLOSSARY.length,
  catalogGlyphVariants:4,
  wingOnlyMatches,
  variousFormation,
  scopes: 'Data and filter inventory, not an exhaustive taxonomic or factual verification.'
};
fs.writeFileSync(path.join(__dirname, 'data-findings.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
