/* External search accepts only canonical public reference queries.
 * This is an allowlist, not a PII detector or a claim of FERPA compliance.
 * Never add arbitrary user text, model output, school names or identifiers here.
 */
function publicSearchQuery(value) {
  if (typeof value !== 'string' || value.length > 200) return '';
  const q = value.trim().replace(/\s+/g, ' ');
  const udl = q.match(/^site:udlguidelines\.cast\.org UDL Guidelines (3\.0|2\.2)((?: (?:engagement|representation|action and expression|feedback|choice|identity|belonging|collaboration|reflection|language|perception|goals)){0,3})$/i);
  if (udl) return 'site:udlguidelines.cast.org UDL Guidelines ' + udl[1] + udl[2].toLowerCase();
  const standard = q.match(/^site:(thecorestandards\.org|nextgenscience\.org) (.+) official standard$/i);
  if (standard) {
    const codes = standard[2].toUpperCase().split(' ');
    const ela = /^(?:CCSS\.ELA-LITERACY\.)?(?:RL|RI|RF|W|SL|L)\.(?:K|[1-9]|1[0-2]|9-10|11-12)\.[1-9][0-9]?(?:\.[A-F])?$/;
    const math = /^(?:CCSS\.MATH\.CONTENT\.)?(?:K|[1-9]|1[0-2])\.(?:CC|OA|NBT|NF|MD|G|RP|NS|EE|SP|F)\.[A-F]\.[1-9][0-9]?(?:\.[A-F])?$/;
    const ngss = /^(?:K|[1-8]|MS|HS)-(?:PS|LS|ESS|ETS)[1-4]-[1-9][0-9]?$/;
    const isNgss = standard[1].toLowerCase() === 'nextgenscience.org';
    if (codes.length <= 3 && codes.every(code => isNgss ? ngss.test(code) : ela.test(code) || math.test(code)))
      return 'site:' + standard[1].toLowerCase() + ' ' + codes.join(' ') + ' official standard';
  }
  // Exact matches only: never extract vocabulary from a private narrative.

  return publicSearchQuery.topics.includes(q.toLowerCase()) ? q.toLowerCase() : '';
}
publicSearchQuery.topics = Object.freeze(['orbital period & seasons', 'weather fronts', 'main idea', 'photosynthesis', 'water cycle', 'plate tectonics', 'fractions',
    'formative assessment', 'retrieval practice', 'spaced practice', 'explicit instruction',
    'universal design for learning', 'differentiated instruction', 'reading comprehension',
    'phonemic awareness', 'phonics', 'executive function', 'cooperative learning',
    'common core reading standards grade 3',
    'udl', 'cell structure', 'ecosystems', 'food webs', 'natural selection', 'biodiversity', 'climate change', 'moon phases', 'energy transfer', 'forces and motion', 'magnetism', 'sound waves', 'states of matter', 'chemical reactions', 'area and perimeter', 'place value', 'ratios', 'proportional relationships', 'linear equations', 'probability', 'data analysis', 'argument and evidence', 'context clues', 'figurative language', 'central idea', 'perspective taking', 'student choice', 'accessible assessment', 'multiple means of representation', 'feedback', 'metacognition']);
module.exports = publicSearchQuery;
