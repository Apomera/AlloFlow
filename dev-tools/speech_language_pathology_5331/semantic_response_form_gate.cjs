'use strict';

const TARGET_SUFFIXES = new Set(['009', '026', '034', '061', '062', '064', '094']);

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
}

function findResponseFormIssue(item) {
  const match = String(item && item.id || '').match(/^slp5331-b[12]-(\d{3})$/);
  if (!match || !TARGET_SUFFIXES.has(match[1])) return '';
  const prompt = normalize(item.prompt);
  const choices = Array.isArray(item.choices) ? item.choices : [];
  const answer = normalize(choices[item.answerIndex]);
  if (!prompt || !answer) return 'The reviewed stem or keyed response is empty.';

  switch (match[1]) {
    case '009':
      if (!/(outer or middle ear|sound transmission)/.test(prompt) || !/(what type|classified as)/.test(prompt) || !/conductive hearing loss/.test(answer)) return 'The hearing-loss stem must ask for a classification supported by an outer- or middle-ear transmission finding, and the key must name conductive hearing loss.';
      break;
    case '026':
      if (!/(bilingual|multilingual|home-language|home language|dialect)/.test(prompt) || !/(interpretation|conclusion)/.test(prompt) || !/(language|linguistic) difference/.test(answer)) return 'The language-difference stem must present interpretable multilingual or dialect evidence, and the key must answer the requested interpretation.';
      break;
    case '034':
      if (!/(cough|wet vocal|wet voice)/.test(prompt) || !/interpret/.test(prompt) || !/(airway invasion|impaired clearance)/.test(answer)) return 'The swallowing-safety stem must present a symptom pattern and ask for its interpretation, which the key must provide.';
      break;
    case '061':
      if (!/(which instrumental (study|method)|which study)/.test(prompt) || !/(videofluoroscopic swallowing study|vfss)/.test(answer)) return 'The VFSS stem must ask which instrumental study or method is described, and the key must identify VFSS.';
      break;
    case '062':
      if (!/(fees|which study)/.test(prompt) || !/fees/.test(answer) || !/(without ionizing radiation|portable|secretions|fatigue|repeated trials)/.test(answer)) return 'The FEES stem and key must identify both the procedure and the advantage being tested.';
      break;
    case '064':
      if (!/(mastication|bolus formation|oral residue)/.test(prompt) || !/(which (?:swallowing )?phases?|phases? (?:is|are))/.test(prompt) || !/oral (preparatory|transit)/.test(answer)) return 'The oral-phase stem must present an oral-phase finding and ask which phase is implicated, and the key must name the oral phase.';
      break;
    case '094':
      if (/^(yes|no)\b/.test(answer) || !/(assessment|instrumental study)/.test(prompt + ' ' + answer) || !/(benefit|individual)/.test(answer)) return 'The postural-strategy key must answer both prescribing and generalization forms without an orphaned yes/no response.';
      break;
    default:
      break;
  }
  return '';
}

module.exports = { TARGET_SUFFIXES, findResponseFormIssue };
