'use strict';

const source = require('../plt_k6_5622/item_content.cjs');
const refs = [
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5623.pdf',
  'https://praxis.ets.org/test/principles-of-learning-and-teaching-plt-grades-5-9-5623.html',
  'https://ccsso.org/resource-library/intasc-model-core-teaching-standards-and-learning-progressions-teachers-10',
  'https://ies.ed.gov/ncee/wwc/PracticeGuides',
];

const gradeMap = {
  kindergarten: 'fifth grade',
  'first grade': 'sixth grade', 'first-grade': 'sixth-grade',
  'second grade': 'seventh grade', 'second-grade': 'seventh-grade',
  'third grade': 'eighth grade', 'third-grade': 'eighth-grade',
  'fourth grade': 'eighth grade', 'fourth-grade': 'eighth-grade',
  'fifth grade': 'ninth grade', 'fifth-grade': 'ninth-grade',
  'sixth grade': 'ninth grade', 'sixth-grade': 'ninth-grade',
};

const rewrite = (value) => String(value || '')
  .replace(/\bgrades?\s+K\s*[-\u2010-\u2015]\s*6\b/gi, 'grades 5\u20139')
  .replace(/\bK\s*[-\u2010-\u2015]\s*6\b/gi, 'grades 5\u20139')
  .replace(/kindergarten|first[- ]grade|second[- ]grade|third[- ]grade|fourth[- ]grade|fifth[- ]grade|sixth[- ]grade/gi,
    (match) => gradeMap[match.toLowerCase()] || match)
  .replace(/elementary/gi, 'middle-grades')
  .replace(/young children/gi, 'early adolescents')
  .replace(/children/gi, 'learners')
  .replace(/\ba eighth([ -]grade| grader)/gi, 'an eighth$1')
  .replace(/\ban middle-grades/gi, 'a middle-grades');

module.exports = source.map((bank, index) => ({
  id: bank.id.replace(/k6/g, 'grades-5-9'),
  chapterId: 'plt5623-ch-' + String(index + 1).padStart(2, '0'),
  domainId: bank.domainId,
  domain: bank.domain,
  label: rewrite(bank.label),
  references: refs.slice(),
  questions: bank.questions.map((question, questionIndex) => ({
    promptA: 'In a grades 5\u20139 setting, ' + rewrite(question.promptA).replace(/^./, (letter) => letter.toLowerCase()),
    promptB: 'In a parallel middle-grades setting, ' + rewrite(question.promptB).replace(/^./, (letter) => letter.toLowerCase()),
    correct: rewrite(question.correct),
    distractors: question.distractors.map(rewrite),
    rationale: rewrite(question.rationale) + ' The response should account for early-adolescent development, increasing disciplinary complexity, identity and peer context, learner agency, equitable access, and evidence of independent transfer.',
    difficulty: question.difficulty || (questionIndex % 3 === 0 ? 'analysis' : 'application'),
  })),
}));