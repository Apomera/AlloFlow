'use strict';

const source = require('../plt_k6_5622/item_content.cjs');

const references = [
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw381f0276/pdfs/5624.pdf',
  'https://praxis.ets.org/test/principles-of-learning-and-teaching-plt-grades-7-12-5624.html',
  'https://ccsso.org/resource-library/intasc-model-core-teaching-standards-and-learning-progressions-teachers-10',
  'https://ies.ed.gov/ncee/wwc/PracticeGuides',
];

const gradeMap = {
  kindergarten: 'seventh grade',
  'first grade': 'eighth grade', 'first-grade': 'eighth-grade',
  'second grade': 'ninth grade', 'second-grade': 'ninth-grade',
  'third grade': 'tenth grade', 'third-grade': 'tenth-grade',
  'fourth grade': 'eleventh grade', 'fourth-grade': 'eleventh-grade',
  'fifth grade': 'twelfth grade', 'fifth-grade': 'twelfth-grade',
  'sixth grade': 'twelfth grade', 'sixth-grade': 'twelfth-grade',
};

const rewrite = (value) => String(value || '')
  .replace(/\bgrades?\s+K\s*[-\u2010-\u2015]\s*6\b/gi, 'grades 7\u201312')
  .replace(/\bK\s*[-\u2010-\u2015]\s*6\b/gi, 'grades 7\u201312')
  .replace(/kindergarten|first[- ]grade|second[- ]grade|third[- ]grade|fourth[- ]grade|fifth[- ]grade|sixth[- ]grade/gi,
    (match) => gradeMap[match.toLowerCase()] || match)
  .replace(/elementary/gi, 'secondary')
  .replace(/young children/gi, 'adolescents')
  .replace(/children/gi, 'learners')
  .replace(/\ba eighth([ -]grade| grader)/gi, 'an eighth$1')
  .replace(/\ba eleventh([ -]grade| grader)/gi, 'an eleventh$1')
  .replace(/\ban secondary/gi, 'a secondary');

module.exports = source.map((bank, index) => ({
  id: bank.id.replace(/k6/g, 'grades-7-12'),
  chapterId: 'plt5624-ch-' + String(index + 1).padStart(2, '0'),
  domainId: bank.domainId,
  domain: bank.domain,
  label: rewrite(bank.label),
  references: references.slice(),
  questions: bank.questions.map((question, questionIndex) => ({
    promptA: 'In a grades 7\u201312 setting, ' + rewrite(question.promptA).replace(/^./, (letter) => letter.toLowerCase()),
    promptB: 'In a parallel secondary setting, ' + rewrite(question.promptB).replace(/^./, (letter) => letter.toLowerCase()),
    correct: rewrite(question.correct),
    distractors: question.distractors.map(rewrite),
    rationale: rewrite(question.rationale) + ' The response should account for adolescent development, disciplinary literacy and advanced content, identity and peer context, learner agency, equitable access, independent transfer, and preparation for college, career, and civic life.',
    difficulty: question.difficulty || (questionIndex % 3 === 0 ? 'analysis' : 'application'),
  })),
}));