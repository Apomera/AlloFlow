'use strict';

const banks = require('./standalone_item_content.json');

const questionCount = banks.reduce((sum, bank) => sum + (bank.questions || []).length, 0);
if (banks.length !== 12 || questionCount !== 100) {
  throw new Error(`Teaching Reading 5205 standalone source must contain 12 banks and 100 kernels; found ${banks.length}/${questionCount}.`);
}

module.exports = banks;