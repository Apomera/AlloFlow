'use strict';

const reading = require('./reading_items.cjs');
const writing = require('./writing_items.cjs');
const math = require('./math_items.cjs');
const banks = [...reading, ...writing, ...math];

if (banks.length !== 12) throw new Error('Praxis Core 5752 must define exactly 12 skill banks.');
if (banks.reduce((sum, bank) => sum + bank.questions.length, 0) !== 100) throw new Error('Praxis Core 5752 must define exactly 100 parallel item specifications.');

module.exports = banks;
module.exports.sources = require('./sources.cjs');
