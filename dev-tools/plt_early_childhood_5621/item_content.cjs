'use strict';

const source = require('../plt_k6_5622/item_content.cjs');

const refs = [
  'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5621.pdf',
  'https://praxis.ets.org/test/principles-of-learning-and-teaching-plt-early-childhood-5621.html',
  'https://ccsso.org/resource-library/intasc-model-core-teaching-standards-and-learning-progressions-teachers-10',
  'https://www.naeyc.org/resources/position-statements/dap/principles',
];

const rewrite = (value) => String(value || '')
  .replace(/\bgrades?\s+K\s*[-\u2010-\u2015]\s*6\b/gi, 'preschool\u2013grade 3')
  .replace(/\bK\s*[-\u2010-\u2015]\s*6\b/gi, 'preschool\u2013grade 3')
  .replace(/grade-equivalent score of 6\.2/gi, 'grade-equivalent score of 3.2')
  .replace(/\bat grade 7\.5\b/gi, 'at grade 2.5')
  .replace(/\bfourth grader\b/gi, 'second grader')
  .replace(/elementary/gi, 'early-childhood')
  .replace(/sixth-grade/gi, 'third-grade')
  .replace(/fifth-grade/gi, 'third-grade')
  .replace(/fourth-grade/gi, 'second-grade')
  .replace(/\ba student\b/gi, 'a young learner')
  .replace(/\bstudents\b/gi, 'young learners');

module.exports = source.map((bank, index) => ({
  id: bank.id.replace(/k6/g, 'early-childhood'),
  chapterId: 'plt5621-ch-' + String(index + 1).padStart(2, '0'),
  domainId: bank.domainId,
  domain: bank.domain,
  label: rewrite(bank.label),
  references: refs.slice(),
  questions: bank.questions.map((question, questionIndex) => ({
    promptA: 'In a preschool\u2013grade 3 setting, ' + rewrite(question.promptA).replace(/^./, (letter) => letter.toLowerCase()),
    promptB: 'In a parallel early-childhood setting, ' + rewrite(question.promptB).replace(/^./, (letter) => letter.toLowerCase()),
    correct: rewrite(question.correct),
    distractors: question.distractors.map(rewrite),
    rationale: rewrite(question.rationale) + ' The response must fit young children\u2019s development, play, relationships, language, access, safety, family context, and observable learning evidence.',
    difficulty: question.difficulty || (questionIndex % 3 === 0 ? 'analysis' : 'application'),
  })),
}));