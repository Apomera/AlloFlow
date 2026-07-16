'use strict';

const banks = [
  ...require('./linguistics_learning_items.cjs'),
  ...require('./instruction_assessment_items.cjs'),
  ...require('./culture_professional_items.cjs'),
];

if (banks.length !== 12) throw new Error('Praxis ESOL 5362 must define exactly 12 skill banks.');
if (banks.reduce((sum, bank) => sum + bank.questions.length, 0) !== 100) throw new Error('Praxis ESOL 5362 must define exactly 100 parallel item specifications.');

module.exports = banks;
module.exports.sources = require('./sources.cjs');
